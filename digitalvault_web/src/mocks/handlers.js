import { http, HttpResponse } from 'msw'
import { getDb, nextId, saveDb, setSessionUserId } from './db'
import { extraHandlers } from './extraHandlers'
import { hasUnknownFields, isBlank, ownerRoute, problem, route } from './helpers'
import { createAssetOverlayHandlers } from './overlay'

const vaultDto = ({ vaultId, name, description, status }) => ({ vaultId, name, description, status })
const assetDto = ({ assetId, name, type, description, status, documents }) => ({
  assetId,
  name,
  type,
  description,
  status,
  documents,
})

function ownedVaults(db, userId) {
  return db.vaults.filter((vault) => vault.ownerId === userId)
}

function ownedAssets(db, userId) {
  const vaultIds = ownedVaults(db, userId).map((vault) => vault.vaultId)
  return db.assets.filter((asset) => vaultIds.includes(asset.vaultId))
}

function beneficiaryDto(db, assignment) {
  const user = db.users.find((u) => u.userId === assignment.beneficiaryId)
  return {
    assetId: assignment.assetId,
    beneficiaryId: assignment.beneficiaryId,
    fullName: user?.fullName ?? '',
    allocation: assignment.allocation,
    status: assignment.status,
  }
}

// Mô phỏng cặp token của BE: access token ngắn hạn, refresh token 7 ngày và lưu lại để xoay vòng
function issueTokens(userId) {
  const db = getDb()
  const accessToken = `mock-access.${userId}.${crypto.randomUUID()}`
  const refreshToken = `mock-refresh.${crypto.randomUUID()}`
  db.refreshTokens[refreshToken] = { userId, revoked: false }
  saveDb()
  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshToken,
    refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

const TWO_FACTOR_TTL_MS = 5 * 60 * 1000
const TWO_FACTOR_COOLDOWN_MS = 60 * 1000
const MAX_TWO_FACTOR_ATTEMPTS = 5

// Tạo challenge mới (32 ký tự hex như BE) và mã 6 số
function startTwoFactorChallenge(userId) {
  const db = getDb()
  const challengeId = crypto.randomUUID().replace(/-/g, '')
  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  const now = Date.now()
  db.twoFactorChallenges[challengeId] = { userId, code, expiresAt: now + TWO_FACTOR_TTL_MS, attempts: 0, lastSentAt: now }
  saveDb()
  return {
    challengeId,
    method: 'Email',
    expiresAt: new Date(now + TWO_FACTOR_TTL_MS).toISOString(),
    requiresTwoFactor: true,
    mockCode: code,
  }
}

const coreHandlers = [
  http.post(
    '*/api/auth/register',
    route(
      ({ body }) => {
        const allowed = ['fullName', 'email', 'password', 'confirmPassword', 'phone', 'identityNumber']
        if (hasUnknownFields(body, allowed)) return problem(400, 'Request contains fields outside the contract.')
        const { fullName, email, password, confirmPassword, phone, identityNumber } = body ?? {}
        if (isBlank(fullName) || fullName.trim().length > 100) return problem(400, 'Full name is required (max 100).')
        if (isBlank(email) || !/^\S+@\S+\.\S+$/.test(email.trim())) return problem(400, 'Email is invalid.')
        if (typeof password !== 'string' || password.length < 12 || password.length > 1024) {
          return problem(400, 'Password must be 12 to 1024 characters.')
        }
        if (password !== confirmPassword) return problem(400, 'Passwords do not match.')
        // Phone và IdentityNumber (CCCD) là trường tuỳ chọn, tối đa 20 ký tự như BE
        if (typeof phone === 'string' && phone.length > 20) return problem(400, 'Phone is too long (max 20).')
        if (typeof identityNumber === 'string' && identityNumber.length > 20) {
          return problem(400, 'IdentityNumber is too long (max 20).')
        }

        const db = getDb()
        const normalizedEmail = email.trim().toLowerCase()
        if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          return problem(409, 'Email is already registered.')
        }
        const user = {
          userId: nextId('user'),
          fullName: fullName.trim(),
          email: normalizedEmail,
          phone: isBlank(phone) ? null : phone.trim(),
          identityNumber: isBlank(identityNumber) ? null : identityNumber.trim(),
          password,
          roles: ['Owner'],
        }
        db.users.push(user)
        saveDb()
        return HttpResponse.json(
          {
            userId: user.userId,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            identityNumber: user.identityNumber,
            roles: user.roles,
          },
          { status: 201 },
        )
      },
      { auth: false },
    ),
  ),

  http.post(
    '*/api/auth/login',
    route(
      ({ body }) => {
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
        const user = getDb().users.find((u) => u.email.toLowerCase() === email)
        if (!user || user.password !== body?.password) {
          return problem(401, 'Invalid email or password.')
        }
        // Tài khoản bật xác thực hai lớp thì chưa cấp token: trả 202 kèm challenge (mockCode chỉ có ở mock để demo không cần email thật)
        if (getDb().security[user.userId]?.twoFactorEnabled) {
          return HttpResponse.json(startTwoFactorChallenge(user.userId), { status: 202 })
        }
        setSessionUserId(user.userId)
        return HttpResponse.json({ userId: user.userId, roles: user.roles, ...issueTokens(user.userId) })
      },
      { auth: false },
    ),
  ),

  // Đổi cặp token cũ lấy cặp mới; refresh token đã dùng bị thu hồi (xoay vòng như BE)
  http.post(
    '*/api/auth/refresh-token',
    route(
      ({ body }) => {
        if (hasUnknownFields(body, ['refreshToken']) || isBlank(body?.refreshToken)) return problem(400, 'RefreshToken is required.')
        const { refreshToken } = body
        const stored = getDb().refreshTokens[refreshToken]
        if (!stored || stored.revoked) return problem(401, 'Refresh token is invalid or revoked.')
        stored.revoked = true
        return HttpResponse.json(issueTokens(stored.userId))
      },
      { auth: false },
    ),
  ),

  http.post(
    '*/api/auth/2fa/verify',
    route(
      ({ body }) => {
        if (hasUnknownFields(body, ['challengeId', 'code']) || !/^[0-9a-f]{32}$/.test(body?.challengeId ?? '') || !/^\d{6}$/.test(body?.code ?? '')) {
          return problem(400, 'Challenge and a 6 digit code are required.')
        }
        const db = getDb()
        const challenge = db.twoFactorChallenges[body.challengeId]
        if (!challenge || challenge.expiresAt < Date.now() || challenge.attempts >= MAX_TWO_FACTOR_ATTEMPTS) {
          return problem(400, 'Invalid or expired code.')
        }
        if (challenge.code !== body.code) {
          challenge.attempts += 1
          saveDb()
          return problem(400, 'Invalid or expired code.')
        }
        delete db.twoFactorChallenges[body.challengeId]
        const user = db.users.find((item) => item.userId === challenge.userId)
        setSessionUserId(user.userId)
        return HttpResponse.json({ userId: user.userId, roles: user.roles, ...issueTokens(user.userId) })
      },
      { auth: false },
    ),
  ),

  // Gửi lại mã: chờ 60 giây giữa hai lần, challenge cũ bị hủy
  http.post(
    '*/api/auth/2fa/resend',
    route(
      ({ body }) => {
        if (hasUnknownFields(body, ['challengeId']) || !/^[0-9a-f]{32}$/.test(body?.challengeId ?? '')) return problem(400, 'ChallengeId is required.')
        const db = getDb()
        const challenge = db.twoFactorChallenges[body.challengeId]
        if (!challenge || challenge.expiresAt < Date.now()) return problem(400, 'Invalid or expired challenge.')
        if (Date.now() - challenge.lastSentAt < TWO_FACTOR_COOLDOWN_MS) return problem(429, 'Wait before requesting another code.')
        delete db.twoFactorChallenges[body.challengeId]
        return HttpResponse.json(startTwoFactorChallenge(challenge.userId))
      },
      { auth: false },
    ),
  ),

  http.get(
    '*/api/auth/me',
    route(({ userId }) => {
      const user = getDb().users.find((item) => item.userId === userId)
      return HttpResponse.json({ userId, fullName: user.fullName, email: user.email, roles: user.roles, status: 'Active' })
    }),
  ),

  http.post(
    '*/api/auth/logout',
    route(() => {
      setSessionUserId(null)
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    '*/api/owner/vaults',
    ownerRoute(({ userId }) => HttpResponse.json(ownedVaults(getDb(), userId).map(vaultDto))),
  ),

  http.get(
    '*/api/owner/vaults/:vaultId',
    ownerRoute(({ userId, params }) => {
      const vault = ownedVaults(getDb(), userId).find((v) => v.vaultId === Number(params.vaultId))
      return vault ? HttpResponse.json(vaultDto(vault)) : problem(404, 'Vault not found.')
    }),
  ),

  http.post(
    '*/api/owner/vaults',
    ownerRoute(({ userId, body }) => {
      if (hasUnknownFields(body, ['name', 'description'])) return problem(400, 'Request contains fields outside the contract.')
      if (isBlank(body?.name) || body.name.trim().length > 100) return problem(400, 'Name is required (max 100).')
      if (typeof body.description === 'string' && body.description.length > 4000) {
        return problem(400, 'Description is too long (max 4000).')
      }
      const db = getDb()
      const vault = {
        vaultId: nextId('vault'),
        ownerId: userId,
        name: body.name.trim(),
        description: body.description ?? null,
        status: 'Active',
      }
      db.vaults.push(vault)
      saveDb()
      return HttpResponse.json(vaultDto(vault), {
        status: 201,
        headers: { Location: `/api/owner/vaults/${vault.vaultId}` },
      })
    }),
  ),

  http.get(
    '*/api/owner/assets',
    ownerRoute(({ userId }) => HttpResponse.json(ownedAssets(getDb(), userId).map(assetDto))),
  ),

  http.get(
    '*/api/owner/assets/:assetId',
    ownerRoute(({ userId, params }) => {
      const asset = ownedAssets(getDb(), userId).find((a) => a.assetId === Number(params.assetId))
      return asset ? HttpResponse.json(assetDto(asset)) : problem(404, 'Asset not found.')
    }),
  ),

  http.post(
    '*/api/owner/assets',
    ownerRoute(({ userId, body }) => {
      if (hasUnknownFields(body, ['vaultId', 'name', 'type', 'description'])) {
        return problem(400, 'Request contains fields outside the contract.')
      }
      if (!Number.isInteger(body?.vaultId) || body.vaultId < 1) return problem(400, 'VaultId is required.')
      if (isBlank(body.name) || body.name.trim().length > 100) return problem(400, 'Name is required (max 100).')
      // AssetType là varchar(50) nên BE chỉ nhận ký tự ASCII in được
      if (typeof body.type !== 'string' || !/^[\x20-\x7E]{1,50}$/.test(body.type)) {
        return problem(400, 'Type must be 1-50 ASCII characters.')
      }
      if (typeof body.description === 'string' && body.description.length > 4000) {
        return problem(400, 'Description is too long (max 4000).')
      }
      const db = getDb()
      const vault = ownedVaults(db, userId).find((v) => v.vaultId === body.vaultId)
      if (!vault) return problem(404, 'Vault not found.')
      if (vault.status !== 'Active') return problem(409, 'Vault is not active.')

      const asset = {
        assetId: nextId('asset'),
        vaultId: vault.vaultId,
        name: body.name.trim(),
        type: body.type,
        description: body.description ?? null,
        status: 'Active',
        documents: [],
      }
      db.assets.push(asset)
      saveDb()
      return HttpResponse.json(assetDto(asset), {
        status: 201,
        headers: { Location: `/api/owner/assets/${asset.assetId}` },
      })
    }),
  ),

  // Upload giấy tờ: kiểm tra các ràng buộc như BE (file, chữ ký rời, người thụ hưởng, trạng thái chủ sở hữu)
  http.post(
    '*/api/owner/assets/:assetId/documents',
    ownerRoute(async ({ userId, params, request }) => {
      const db = getDb()
      const asset = ownedAssets(db, userId).find((a) => a.assetId === Number(params.assetId))
      if (!asset) return problem(404, 'Asset not found.')

      let form
      try {
        form = await request.formData()
      } catch {
        return problem(400, 'Request must be multipart/form-data.')
      }
      const isFile = (value) => value !== null && typeof value === 'object' && typeof value.size === 'number'
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain']
      const badDocument = (value) => !isFile(value) || value.size <= 0 || value.size > 10 * 1024 * 1024 || !allowedTypes.includes(value.type)

      const file = form.get('file')
      if (badDocument(file)) return problem(400, 'File must be 1 byte to 10 MB and a PDF, PNG, JPEG or text file.')
      const beneficiaryId = Number(form.get('beneficiaryId'))
      if (!Number.isInteger(beneficiaryId) || beneficiaryId < 1) return problem(400, 'BeneficiaryId is required.')
      const aliveText = String(form.get('ownerAlive') ?? '').toLowerCase()
      if (aliveText !== 'true' && aliveText !== 'false') return problem(400, 'OwnerAlive is required.')
      const ownerAlive = aliveText === 'true'

      if (ownerAlive) {
        const signature = form.get('signature')
        if (!isFile(signature) || signature.size <= 0 || signature.size > 16384) return problem(400, 'Detached signature is required (max 16 KB).')
      } else if (badDocument(form.get('deathCertificate'))) {
        return problem(400, 'Death certificate is required.')
      }

      const target = db.users.find((u) => u.userId === beneficiaryId)
      if (!target || !target.roles.includes('Beneficiary')) return problem(404, 'Beneficiary not found.')
      const active = db.assignments.filter((a) => a.assetId === asset.assetId && a.status === 'Active')
      if (active.length > 0 && !active.some((a) => a.beneficiaryId === beneficiaryId)) {
        return problem(409, 'Choose a beneficiary currently assigned to this asset.')
      }

      const document = { documentId: nextId('document'), fileName: file.name, fileType: file.type, isEncrypted: true, signatureValid: null }
      asset.documents.push(document)
      // Tài sản chưa có người thụ hưởng thì BE tạo phân bổ 100% cho người được chọn
      if (active.length === 0) {
        db.assignments.push({ assetId: asset.assetId, beneficiaryId, allocation: 100, status: 'Active' })
      }
      saveDb()
      return HttpResponse.json(document)
    }),
  ),

  http.get(
    '*/api/owner/beneficiaries',
    ownerRoute(({ userId, request }) => {
      const db = getDb()
      const assets = ownedAssets(db, userId)
      const assetIdParam = new URL(request.url).searchParams.get('assetId')
      if (assetIdParam !== null && !assets.some((a) => a.assetId === Number(assetIdParam))) {
        return problem(404, 'Asset not found.')
      }
      const assetIds = assets.map((a) => a.assetId)
      const list = db.assignments
        .filter((a) => assetIds.includes(a.assetId))
        .filter((a) => assetIdParam === null || a.assetId === Number(assetIdParam))
        .map((a) => beneficiaryDto(db, a))
      return HttpResponse.json(list)
    }),
  ),

  http.post(
    '*/api/owner/assets/:assetId/beneficiaries',
    ownerRoute(({ userId, params, body }) => {
      if (hasUnknownFields(body, ['email', 'allocation'])) return problem(400, 'Request contains fields outside the contract.')
      const db = getDb()
      const asset = ownedAssets(db, userId).find((a) => a.assetId === Number(params.assetId))
      if (!asset) return problem(404, 'Asset not found.')

      const allocation = body?.allocation ?? 100
      const hasTwoDecimals = Number.isFinite(allocation) && Math.round(allocation * 100) / 100 === allocation
      if (!hasTwoDecimals || allocation < 0.01 || allocation > 100) {
        return problem(400, 'Allocation must be between 0.01 and 100 with at most two decimals.')
      }
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
      if (!email) return problem(400, 'Email is required.')
      const target = db.users.find((u) => u.email.toLowerCase() === email)
      if (!target) return problem(404, 'No active account with this email.')
      if (target.userId === userId) return problem(400, 'You cannot assign yourself as beneficiary.')

      const current = db.assignments.filter((a) => a.assetId === asset.assetId && a.status === 'Active')
      if (current.some((a) => a.beneficiaryId === target.userId)) return problem(409, 'Beneficiary is already assigned.')
      const total = current.reduce((sum, a) => sum + a.allocation, 0)
      if (Math.round((total + allocation) * 100) / 100 > 100) return problem(409, 'Total allocation exceeds 100%.')

      const assignment = { assetId: asset.assetId, beneficiaryId: target.userId, allocation, status: 'Active' }
      db.assignments.push(assignment)
      if (!target.roles.includes('Beneficiary')) target.roles.push('Beneficiary')
      saveDb()
      return HttpResponse.json(beneficiaryDto(db, assignment), { status: 201 })
    }),
  ),
]

// Mock đầy đủ = API đã có ở BE + API chưa có; chế độ hỗn hợp chỉ mock phần BE chưa có
export const handlers = [...coreHandlers, ...extraHandlers]
export const hybridHandlers = [...createAssetOverlayHandlers(), ...extraHandlers]
