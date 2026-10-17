import { http, HttpResponse } from 'msw'
import { computeProofOfLife } from '../utils/proofOfLife'
import { LIMITS, isStrongPassword, isValidPhone, validateEmailOnly } from '../utils/validators'
import { getDb, getFrontendEmail, isMockHybrid, nextId, saveDb } from './db'
import { hasUnknownFields, ownerRoute, problem, route } from './helpers'

// Các API mà BE chưa có (điểm danh, nhật ký, executor, bảo mật...). Dùng được ở cả chế độ mock đầy đủ lẫn hỗn hợp.

const DAY = 24 * 60 * 60 * 1000
const isIntegerInRange = (value, max) => Number.isInteger(value) && value >= 1 && value <= max

// Trạng thái và hạn tiếp theo luôn được tính lại từ thời gian hiện tại
function proofOfLifeDto(record) {
  const { status, nextPingDue } = computeProofOfLife(record)
  return {
    frequencyDays: record.frequencyDays,
    gracePeriodDays: record.gracePeriodDays,
    lastPingAt: record.lastPingAt,
    nextPingDue,
    status,
    missedCount: record.missedCount,
  }
}

const proofOfLifeHandlers = [
  http.get(
    '*/api/owner/proof-of-life',
    ownerRoute(({ userId }) => {
      const record = getDb().proofOfLife[userId]
      return record ? HttpResponse.json(proofOfLifeDto(record)) : problem(404, 'Proof of life is not configured.')
    }),
  ),

  http.put(
    '*/api/owner/proof-of-life',
    ownerRoute(({ userId, body }) => {
      if (hasUnknownFields(body, ['frequencyDays', 'gracePeriodDays'])) {
        return problem(400, 'Request contains fields outside the contract.')
      }
      if (!isIntegerInRange(body?.frequencyDays, 365) || !isIntegerInRange(body?.gracePeriodDays, 90)) {
        return problem(400, 'Invalid proof of life input.')
      }
      const db = getDb()
      const existing = db.proofOfLife[userId]
      if (existing && computeProofOfLife(existing).status === 'Triggered') {
        return problem(409, 'Proof of life has already been triggered.')
      }
      db.proofOfLife[userId] = existing
        ? { ...existing, frequencyDays: body.frequencyDays, gracePeriodDays: body.gracePeriodDays }
        : { frequencyDays: body.frequencyDays, gracePeriodDays: body.gracePeriodDays, lastPingAt: new Date().toISOString(), missedCount: 0 }
      saveDb()
      return HttpResponse.json(proofOfLifeDto(db.proofOfLife[userId]))
    }),
  ),

  http.post(
    '*/api/owner/proof-of-life/ping',
    ownerRoute(({ userId }) => {
      const db = getDb()
      const record = db.proofOfLife[userId]
      if (!record) return problem(404, 'Proof of life is not configured.')
      const { status } = computeProofOfLife(record)
      if (status === 'Triggered') return problem(409, 'Proof of life has already been triggered.')
      // Điểm danh khi đã quá hạn (đang trong ân hạn) được tính là một lần bỏ lỡ
      record.missedCount += status === 'Warning' ? 1 : 0
      record.lastPingAt = new Date().toISOString()
      saveDb()
      return HttpResponse.json(proofOfLifeDto(record))
    }),
  ),

  // Chỉ có ở mock: lùi thời điểm điểm danh gần nhất N ngày để thấy trạng thái Cảnh báo và Đã kích hoạt
  http.post(
    '*/api/owner/proof-of-life/simulate',
    ownerRoute(({ userId, body }) => {
      if (!isIntegerInRange(body?.days, 400)) return problem(400, 'Days must be an integer from 1 to 400.')
      const db = getDb()
      const record = db.proofOfLife[userId]
      if (!record) return problem(404, 'Proof of life is not configured.')
      record.lastPingAt = new Date(new Date(record.lastPingAt).getTime() - body.days * DAY).toISOString()
      saveDb()
      return HttpResponse.json(proofOfLifeDto(record))
    }),
  ),
]

const activityLogHandlers = [
  // Nhật ký của chính người dùng, mới nhất trước; cột theo bảng AuditLog của BE
  http.get(
    '*/api/owner/activity-logs',
    ownerRoute(({ userId }) => {
      const logs = getDb()
        .activityLogs.filter((log) => log.userId === userId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(({ logId, action, entityType, entityId, timestamp, ipAddress, result }) => ({ logId, action, entityType, entityId, timestamp, ipAddress, result }))
      return HttpResponse.json(logs)
    }),
  ),
]

// Executor: BE mới có bảng ExecutorAssignment (theo kho) nhưng chưa có API
const executorProfile = ({ executorId, fullName, organization, licenseNumber, email, hotline, address }) => ({
  executorId,
  fullName,
  organization,
  licenseNumber,
  email,
  hotline,
  address,
})

function executorDto(db, vaultId, assignment) {
  const profile = db.executors.find((executor) => executor.executorId === assignment.executorId)
  return {
    vaultId,
    ...executorProfile(profile),
    status: assignment.status,
    assignedAt: assignment.assignedAt,
    contractNumber: assignment.contractNumber,
  }
}

// Ở chế độ hỗn hợp kho nằm ở BE thật nên mock không kiểm tra được quyền sở hữu kho
const canUseVault = (db, userId, vaultId) =>
  isMockHybrid() ? Number.isInteger(vaultId) : db.vaults.some((vault) => vault.vaultId === vaultId && vault.ownerId === userId)

const executorHandlers = [
  http.get(
    '*/api/owner/executors',
    ownerRoute(() => HttpResponse.json(getDb().executors.map(executorProfile))),
  ),

  http.get(
    '*/api/owner/vaults/:vaultId/executor',
    ownerRoute(({ userId, params }) => {
      const db = getDb()
      const vaultId = Number(params.vaultId)
      const assignment = canUseVault(db, userId, vaultId) ? db.executorAssignments[vaultId] : null
      return assignment ? HttpResponse.json(executorDto(db, vaultId, assignment)) : problem(404, 'Executor is not assigned.')
    }),
  ),

  // Gán hoặc đổi Executor: luôn tạo hợp đồng ủy quyền mới ở trạng thái chờ Executor chấp nhận
  http.put(
    '*/api/owner/vaults/:vaultId/executor',
    ownerRoute(({ userId, params, body }) => {
      if (hasUnknownFields(body, ['executorId']) || !Number.isInteger(body?.executorId)) {
        return problem(400, 'Request contains fields outside the contract.')
      }
      const db = getDb()
      const vaultId = Number(params.vaultId)
      if (!canUseVault(db, userId, vaultId)) return problem(404, 'Vault not found.')
      if (!db.executors.some((executor) => executor.executorId === body.executorId)) return problem(404, 'Executor not found.')
      const contractNumber = `HD-UQ-${new Date().getFullYear()}-${String(nextId('contract')).padStart(4, '0')}`
      db.executorAssignments[vaultId] ={ executorId: body.executorId, status: 'Pending', assignedAt: new Date().toISOString(), contractNumber }
      saveDb()
      return HttpResponse.json(executorDto(db, vaultId, db.executorAssignments[vaultId]))
    }),
  ),

  http.delete(
    '*/api/owner/vaults/:vaultId/executor',
    ownerRoute(({ userId, params }) => {
      const db = getDb()
      const vaultId = Number(params.vaultId)
      if (!canUseVault(db, userId, vaultId) || !db.executorAssignments[vaultId]) return problem(404, 'Executor is not assigned.')
      delete db.executorAssignments[vaultId]
      saveDb()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  // Chỉ có ở mock: giả lập Executor bấm chấp nhận lời ủy quyền
  http.post(
    '*/api/owner/vaults/:vaultId/executor/accept',
    ownerRoute(({ userId, params }) => {
      const db = getDb()
      const vaultId = Number(params.vaultId)
      const assignment = canUseVault(db, userId, vaultId) ? db.executorAssignments[vaultId] : null
      if (!assignment) return problem(404, 'Executor is not assigned.')
      assignment.status = 'Active'
      saveDb()
      return HttpResponse.json(executorDto(db, vaultId, assignment))
    }),
  ),
]

// Quên mật khẩu: OTP chỉ tồn tại trong mock và được trả về trong mockOtp để demo (BE thật sẽ gửi qua email).
// Email không tồn tại vẫn nhận phản hồi giống hệt nhưng không có OTP để không lộ tài khoản nào đã đăng ký.
const OTP_TTL_MS = 5 * 60 * 1000
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000
const MAX_OTP_ATTEMPTS = 5

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

function maskEmail(email) {
  const [local, domain] = email.split('@')
  return `${local[0]}***${local[local.length - 1]}@${domain}`
}

const passwordResetHandlers = [
  http.post(
    '*/api/auth/forgot-password',
    route(
      ({ body }) => {
        if (hasUnknownFields(body, ['email'])) return problem(400, 'Request contains fields outside the contract.')
        const email = normalizeEmail(body?.email)
        if (!email || validateEmailOnly(email)) return problem(400, 'Email is invalid.')
        const db = getDb()
        const response = { maskedEmail: maskEmail(email), expiresInSeconds: OTP_TTL_MS / 1000 }
        if (!db.users.some((user) => user.email.toLowerCase() === email)) return HttpResponse.json(response)
        const otp = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
        db.passwordResets[email] = { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 }
        saveDb()
        return HttpResponse.json({ ...response, mockOtp: otp })
      },
      { auth: false },
    ),
  ),

  http.post(
    '*/api/auth/verify-reset-otp',
    route(
      ({ body }) => {
        if (hasUnknownFields(body, ['email', 'otp'])) return problem(400, 'Request contains fields outside the contract.')
        const email = normalizeEmail(body?.email)
        if (!email || typeof body?.otp !== 'string' || !/^\d{6}$/.test(body.otp.trim())) return problem(400, 'Email and a 6 digit code are required.')
        const db = getDb()
        const record = db.passwordResets[email]
        if (!record || record.expiresAt < Date.now()) return problem(400, 'Invalid or expired code.')
        if (record.attempts >= MAX_OTP_ATTEMPTS) return problem(429, 'Too many attempts. Request a new code.')
        if (record.otp !== body.otp.trim()) {
          record.attempts += 1
          saveDb()
          return problem(400, 'Invalid or expired code.')
        }
        delete db.passwordResets[email]
        const resetToken = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')
        db.resetTokens[resetToken] = { email, expiresAt: Date.now() + RESET_TOKEN_TTL_MS }
        saveDb()
        return HttpResponse.json({ resetToken })
      },
      { auth: false },
    ),
  ),

  http.post(
    '*/api/auth/reset-password',
    route(
      ({ body }) => {
        if (hasUnknownFields(body, ['resetToken', 'newPassword', 'confirmPassword'])) {
          return problem(400, 'Request contains fields outside the contract.')
        }
        const { resetToken, newPassword, confirmPassword } = body ?? {}
        const db = getDb()
        const entry = typeof resetToken === 'string' ? db.resetTokens[resetToken] : null
        if (!entry || entry.expiresAt < Date.now()) return problem(400, 'Invalid or expired reset token.')
        if (newPassword !== confirmPassword) return problem(400, 'Passwords do not match.')
        if (!isStrongPassword(newPassword)) return problem(400, 'Password must be 12 to 1024 characters with a digit and a symbol.')
        const account = db.users.find((user) => user.email.toLowerCase() === entry.email)
        if (account) {
          account.password = newPassword
          db.security[account.userId] = { ...db.security[account.userId], passwordChangedAt: new Date().toISOString() }
        }
        delete db.resetTokens[resetToken]
        saveDb()
        return new HttpResponse(null, { status: 204 })
      },
      { auth: false },
    ),
  ),
]

// Hồ sơ và bảo mật: tài khoản ở BE thật không có trong mock nên chỉnh sửa được lưu thành lớp phủ theo userId
function profileDto(db, userId) {
  const account = db.users.find((user) => user.userId === userId)
  const overlay = db.profiles[userId] ?? {}
  const security = db.security[userId] ?? {}
  return {
    userId,
    fullName: overlay.fullName ?? account?.fullName ?? '',
    email: account?.email ?? getFrontendEmail(),
    phone: 'phone' in overlay ? overlay.phone : (account?.phone ?? null),
    identityNumber: account?.identityNumber ?? null,
    twoFactorEnabled: security.twoFactorEnabled ?? false,
    passwordChangedAt: security.passwordChangedAt ?? null,
  }
}

const securityHandlers = [
  http.get(
    '*/api/owner/profile',
    ownerRoute(({ userId }) => HttpResponse.json(profileDto(getDb(), userId))),
  ),

  http.put(
    '*/api/owner/profile',
    ownerRoute(({ userId, body }) => {
      if (hasUnknownFields(body, ['fullName', 'phone'])) return problem(400, 'Request contains fields outside the contract.')
      const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''
      if (!fullName || fullName.length > LIMITS.fullName) return problem(400, 'Full name is required (max 100).')
      const rawPhone = body?.phone ?? null
      if (rawPhone !== null && typeof rawPhone !== 'string') return problem(400, 'Phone is invalid.')
      const phone = rawPhone?.trim() || null
      if (phone && !isValidPhone(phone)) return problem(400, 'Phone is invalid.')
      const db = getDb()
      db.profiles[userId] = { fullName, phone }
      saveDb()
      return HttpResponse.json(profileDto(db, userId))
    }),
  ),

  http.post(
    '*/api/owner/change-password',
    ownerRoute(({ userId, body }) => {
      if (hasUnknownFields(body, ['currentPassword', 'newPassword', 'confirmPassword'])) {
        return problem(400, 'Request contains fields outside the contract.')
      }
      const { currentPassword, newPassword, confirmPassword } = body ?? {}
      if (typeof currentPassword !== 'string' || currentPassword === '') return problem(400, 'Current password is required.')
      if (newPassword !== confirmPassword) return problem(400, 'Passwords do not match.')
      if (!isStrongPassword(newPassword)) return problem(400, 'Password must be 12 to 1024 characters with a digit and a symbol.')
      if (newPassword === currentPassword) return problem(400, 'New password must differ from the current one.')
      const db = getDb()
      const account = db.users.find((user) => user.userId === userId)
      // Tài khoản ở BE thật không có mật khẩu trong mock nên không kiểm tra được, chỉ ghi nhận thao tác mô phỏng
      if (account && account.password !== currentPassword) return problem(403, 'Current password is incorrect.')
      if (account) account.password = newPassword
      db.security[userId] = { ...db.security[userId], passwordChangedAt: new Date().toISOString() }
      saveDb()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.put(
    '*/api/owner/security/two-factor',
    ownerRoute(({ userId, body }) => {
      if (hasUnknownFields(body, ['enabled']) || typeof body?.enabled !== 'boolean') {
        return problem(400, 'Enabled must be a boolean.')
      }
      const db = getDb()
      db.security[userId] = { ...db.security[userId], twoFactorEnabled: body.enabled }
      saveDb()
      return HttpResponse.json({ twoFactorEnabled: body.enabled })
    }),
  ),
]

export const extraHandlers = [...proofOfLifeHandlers, ...activityLogHandlers, ...executorHandlers, ...securityHandlers, ...passwordResetHandlers]
