import { http, HttpResponse } from 'msw'
import { getDb, saveDb } from './db'
import { hasUnknownFields, problem, route } from './helpers'

// Mock API cổng Người thụ hưởng + thông báo (bám swagger BE: /api/beneficiary/*, /api/notifications).
// Dữ liệu được tạo lười theo userId trong db.beneficiaryPortal nên không cần đổi DB_VERSION.

const OTP_TTL_MS = 5 * 60 * 1000
const OTP_SESSION_MS = 15 * 60 * 1000
const MAX_OTP_ATTEMPTS = 5

const beneficiaryRoute = (handler) => route(handler, { role: 'Beneficiary' })
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString()
const doc = (documentId, fileName, fileType = 'application/pdf', signatureValid = null) => ({ documentId, fileName, fileType, isEncrypted: true, signatureValid })

function seedPortal(userId) {
  return {
    inheritances: [
      {
        handoverId: 101,
        allocation: 60,
        asset: {
          assetId: 1,
          name: 'Ví Lạnh Trữ Crypto (BTC & ETH Portfolio - 3.4 BTC)',
          type: 'CryptoWallet',
          description: 'Bao gồm Seed Phrase 24 ký tự và khóa phụ Shamir. Địa chỉ ví: 0x71C...4942.',
          status: 'Active',
          documents: [doc(31, 'HuongDanKhoiPhucVi.pdf')],
        },
      },
      {
        handoverId: 102,
        allocation: 100,
        asset: {
          assetId: 2,
          name: 'Tài Khoản Tiết Kiệm Số Vietcombank Priority',
          type: 'BankAccount',
          description: 'Số tài khoản có hợp đồng tiền gửi đính kèm để xác thực công chứng.',
          status: 'Active',
          documents: [doc(11, 'SoTietKiem_Signed.pdf')],
        },
      },
      {
        handoverId: 103,
        allocation: 50,
        asset: {
          assetId: 3,
          name: 'Kho Lưu Trữ Kỷ Niệm Gia Đình & Thư Di Nguyện',
          type: 'Document',
          description: 'Kho nén 4.2GB hình ảnh gia đình, video nhắn nhủ và tài liệu bản quyền di chúc số.',
          status: 'Active',
          documents: [doc(12, 'ThuDiNguyen.pdf'), doc(13, 'AnhGiaDinh.png', 'image/png')],
        },
      },
    ],
    cases: [
      { handoverId: 101, assetId: 1, beneficiaryId: userId, status: 'Completed' },
      { handoverId: 102, assetId: 2, beneficiaryId: userId, status: 'In_Progress' },
      { handoverId: 103, assetId: 3, beneficiaryId: userId, status: 'Pending' },
    ],
    handoverDocuments: {
      101: [doc(201, 'BienBanBanGiao_HS101.pdf', 'application/pdf', true), doc(202, 'GiayChungTu_BanSao.pdf', 'application/pdf', true)],
      102: [doc(203, 'QuyetDinhDuyetPhapLy.pdf', 'application/pdf', true)],
      103: [],
    },
    receipts: {},
    nextReceiptId: 1,
    otpVerifiedUntil: 0,
  }
}

function seedNotifications() {
  return {
    nextId: 5,
    items: [
      { notificationId: 4, type: 'HandoverCompleted', title: 'Hồ sơ #101 đã bàn giao xong', message: 'Người thi hành đã nộp biên bản có chữ ký số. Vui lòng kiểm tra và xác nhận đã nhận tài sản.', isRead: false, createdAt: minutesAgo(25) },
      { notificationId: 3, type: 'HandoverStarted', title: 'Bắt đầu chuyển giao hồ sơ #102', message: 'Hồ sơ đã được duyệt pháp lý, người thi hành đang chuyển giao tài sản cho bạn.', isRead: false, createdAt: minutesAgo(60 * 5) },
      { notificationId: 2, type: 'LegalApproved', title: 'Pháp lý đã duyệt', message: 'Công chứng viên đã xác minh giấy chứng tử và duyệt hồ sơ bàn giao.', isRead: true, createdAt: minutesAgo(60 * 26) },
      { notificationId: 1, type: 'BeneficiaryAssigned', title: 'Bạn được chỉ định là người thụ hưởng', message: 'Một chủ sở hữu đã phân bổ tài sản số cho bạn trong kho di sản.', isRead: true, createdAt: minutesAgo(60 * 24 * 6) },
    ],
  }
}

function portalOf(userId) {
  const db = getDb()
  db.beneficiaryPortal ??= {}
  db.beneficiaryPortal[userId] ??= seedPortal(userId)
  return db.beneficiaryPortal[userId]
}

function inboxOf(userId) {
  const db = getDb()
  db.notificationInbox ??= {}
  db.notificationInbox[userId] ??= seedNotifications()
  return db.notificationInbox[userId]
}

function pushNotification(userId, { type, title, message }) {
  const inbox = inboxOf(userId)
  inbox.items.unshift({ notificationId: inbox.nextId, type, title, message, isRead: false, createdAt: new Date().toISOString() })
  inbox.nextId += 1
}

// Giống BE: dữ liệu thụ hưởng chỉ mở sau khi xác thực OTP
function requireOtp(portal) {
  return portal.otpVerifiedUntil > Date.now() ? null : problem(403, 'OTP verification required.')
}

function paged(request, items) {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get('pageSize')) || 20))
  return HttpResponse.json({ page, pageSize, items: items.slice((page - 1) * pageSize, page * pageSize) })
}

function fileResponse(fileName, signatureValid) {
  const content = `Tệp mô phỏng cho giấy tờ "${fileName}".\nĐây là nội dung mô phỏng, không phải bản gốc đã mã hóa lưu trên máy chủ.\n`
  return new HttpResponse(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Signature-Valid': signatureValid ? 'true' : 'false' } })
}

// Mã OTP đang chờ theo challengeId: { userId, code, expiresAt, attempts }
const challenges = new Map()

export const beneficiaryHandlers = [
  // ---- OTP ----
  http.post(
    '*/api/beneficiary/otp/request',
    beneficiaryRoute(({ userId }) => {
      const challengeId = crypto.randomUUID()
      const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString()
      challenges.set(challengeId, { userId, code, expiresAt, attempts: 0 })
      return HttpResponse.json({ challengeId, expiresAt, mockCode: code })
    }),
  ),

  http.post(
    '*/api/beneficiary/otp/verify',
    beneficiaryRoute(({ userId, body }) => {
      if (hasUnknownFields(body, ['challengeId', 'code'])) return problem(400, 'Request contains fields outside the contract.')
      const challenge = challenges.get(body?.challengeId)
      if (!challenge || challenge.userId !== userId) return problem(404, 'OTP challenge not found.')
      if (new Date(challenge.expiresAt).getTime() < Date.now()) {
        challenges.delete(body.challengeId)
        return problem(400, 'OTP expired.')
      }
      if (challenge.attempts >= MAX_OTP_ATTEMPTS) return problem(429, 'Too many attempts.')
      if (challenge.code !== String(body?.code ?? '').trim()) {
        challenge.attempts += 1
        return problem(400, 'Invalid OTP.')
      }
      challenges.delete(body.challengeId)
      const verifiedUntil = Date.now() + OTP_SESSION_MS
      portalOf(userId).otpVerifiedUntil = verifiedUntil
      saveDb()
      return HttpResponse.json({ expiresAt: new Date(verifiedUntil).toISOString() })
    }),
  ),

  // ---- Tài sản thụ hưởng ----
  http.get(
    '*/api/beneficiary/assets',
    beneficiaryRoute(({ userId, request }) => {
      const portal = portalOf(userId)
      return requireOtp(portal) ?? paged(request, portal.inheritances)
    }),
  ),

  http.get(
    '*/api/beneficiary/assets/:assetId',
    beneficiaryRoute(({ userId, params }) => {
      const portal = portalOf(userId)
      const blocked = requireOtp(portal)
      if (blocked) return blocked
      const found = portal.inheritances.find((item) => item.asset.assetId === Number(params.assetId))
      return found ? HttpResponse.json(found) : problem(404, 'Asset not found.')
    }),
  ),

  http.get(
    '*/api/beneficiary/assets/:assetId/documents/:documentId/content',
    beneficiaryRoute(({ userId, params }) => {
      const portal = portalOf(userId)
      const blocked = requireOtp(portal)
      if (blocked) return blocked
      const asset = portal.inheritances.find((item) => item.asset.assetId === Number(params.assetId))?.asset
      const found = asset?.documents.find((item) => item.documentId === Number(params.documentId))
      return found ? fileResponse(found.fileName, true) : problem(404, 'Document not found.')
    }),
  ),

  // ---- Hồ sơ bàn giao ----
  http.get(
    '*/api/beneficiary/handovers',
    beneficiaryRoute(({ userId, request }) => {
      const portal = portalOf(userId)
      return requireOtp(portal) ?? paged(request, portal.cases)
    }),
  ),

  http.get(
    '*/api/beneficiary/handovers/:handoverId',
    beneficiaryRoute(({ userId, params }) => {
      const portal = portalOf(userId)
      const blocked = requireOtp(portal)
      if (blocked) return blocked
      const found = portal.cases.find((item) => item.handoverId === Number(params.handoverId))
      return found ? HttpResponse.json(found) : problem(404, 'Handover not found.')
    }),
  ),

  http.get(
    '*/api/beneficiary/handovers/:handoverId/documents',
    beneficiaryRoute(({ userId, params }) => {
      const portal = portalOf(userId)
      const blocked = requireOtp(portal)
      if (blocked) return blocked
      if (!portal.cases.some((item) => item.handoverId === Number(params.handoverId))) return problem(404, 'Handover not found.')
      return HttpResponse.json(portal.handoverDocuments[params.handoverId] ?? [])
    }),
  ),

  http.get(
    '*/api/beneficiary/handovers/:handoverId/documents/:documentId/content',
    beneficiaryRoute(({ userId, params }) => {
      const portal = portalOf(userId)
      const blocked = requireOtp(portal)
      if (blocked) return blocked
      const found = (portal.handoverDocuments[params.handoverId] ?? []).find((item) => item.documentId === Number(params.documentId))
      return found ? fileResponse(found.fileName, found.signatureValid) : problem(404, 'Document not found.')
    }),
  ),

  // ---- Biên nhận ----
  http.get(
    '*/api/beneficiary/handovers/:handoverId/receipt',
    beneficiaryRoute(({ userId, params }) => {
      const portal = portalOf(userId)
      const blocked = requireOtp(portal)
      if (blocked) return blocked
      const receipt = portal.receipts[params.handoverId]
      return receipt ? HttpResponse.json(receipt) : problem(404, 'Receipt not found.')
    }),
  ),

  http.post(
    '*/api/beneficiary/handovers/:handoverId/receipt',
    beneficiaryRoute(({ userId, params, body }) => {
      const portal = portalOf(userId)
      const blocked = requireOtp(portal)
      if (blocked) return blocked
      if (hasUnknownFields(body, ['note'])) return problem(400, 'Request contains fields outside the contract.')
      if (body?.note != null && (typeof body.note !== 'string' || body.note.length > 1000)) return problem(400, 'Note must be at most 1000 characters.')
      const found = portal.cases.find((item) => item.handoverId === Number(params.handoverId))
      if (!found) return problem(404, 'Handover not found.')
      if (portal.receipts[found.handoverId]) return problem(409, 'Receipt already confirmed.')
      if (found.status !== 'Completed') return problem(409, 'Handover is not completed yet.')
      const receipt = {
        receiptId: portal.nextReceiptId,
        handoverId: found.handoverId,
        beneficiaryId: userId,
        status: 'Confirmed',
        note: body?.note?.trim() || null,
        confirmedAt: new Date().toISOString(),
      }
      portal.nextReceiptId += 1
      portal.receipts[found.handoverId] = receipt
      found.status = 'Received'
      pushNotification(userId, {
        type: 'ReceiptConfirmed',
        title: `Đã cấp biên nhận số #${receipt.receiptId}`,
        message: `Bạn đã xác nhận nhận tài sản của hồ sơ #${found.handoverId}.`,
      })
      saveDb()
      return HttpResponse.json(receipt)
    }),
  ),

  // ---- Thông báo (mọi role đã đăng nhập) ----
  http.get(
    '*/api/notifications',
    route(({ userId, request }) => paged(request, inboxOf(userId).items)),
  ),

  http.post(
    '*/api/notifications/:notificationId/read',
    route(({ userId, params }) => {
      const found = inboxOf(userId).items.find((item) => item.notificationId === Number(params.notificationId))
      if (!found) return problem(404, 'Notification not found.')
      found.isRead = true
      saveDb()
      return new HttpResponse(null, { status: 200 })
    }),
  ),
]
