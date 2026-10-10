import { delay, http, HttpResponse } from 'msw'
import { getDb, getMockLatency, getSessionUserId, nextId, saveDb, setSessionUserId } from './db'

// Trả lỗi đúng định dạng của BE: { status, detail }
function problem(status, detail) {
  return HttpResponse.json({ status, detail }, { status })
}

// Giống middleware BE: body có trường ngoài hợp đồng thì trả 400
function hasUnknownFields(body, allowed) {
  return Object.keys(body ?? {}).some((key) => !allowed.includes(key))
}

const isBlank = (value) => typeof value !== 'string' || value.trim() === ''

// Bọc handler: độ trễ giả, kiểm tra header chống CSRF cho request thay đổi dữ liệu, kiểm tra phiên
function route(handler, { auth = true, role = null } = {}) {
  return async (info) => {
    await delay(getMockLatency())
    const { request } = info
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.get('X-Vault-Request') !== '1') {
      return problem(400, 'Set X-Vault-Request: 1 on mutation requests.')
    }
    let userId = null
    if (auth) {
      userId = getSessionUserId()
      if (userId === null) return problem(401, 'Authentication required.')
      // BE kiểm tra role ở tầng service: đã đăng nhập nhưng sai role thì trả 403
      const account = getDb().users.find((u) => u.userId === userId)
      if (role && !account?.roles.includes(role)) return problem(403, `Role ${role} required.`)
    }
    let body = null
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        body = await request.json()
      } catch {
        body = null
      }
    }
    return handler({ ...info, userId, body })
  }
}

// Endpoint của Owner: BE yêu cầu role Owner, sai role trả 403
const ownerRoute = (handler) => route(handler, { role: 'Owner' })

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

export const handlers = [
  http.post(
    '*/api/auth/register',
    route(
      ({ body }) => {
        const allowed = ['fullName', 'email', 'password', 'confirmPassword', 'phone']
        if (hasUnknownFields(body, allowed)) return problem(400, 'Request contains fields outside the contract.')
        const { fullName, email, password, confirmPassword } = body ?? {}
        if (isBlank(fullName) || fullName.trim().length > 100) return problem(400, 'Full name is required (max 100).')
        if (isBlank(email) || !/^\S+@\S+\.\S+$/.test(email.trim())) return problem(400, 'Email is invalid.')
        if (typeof password !== 'string' || password.length < 12 || password.length > 1024) {
          return problem(400, 'Password must be 12 to 1024 characters.')
        }
        if (password !== confirmPassword) return problem(400, 'Passwords do not match.')

        const db = getDb()
        const normalizedEmail = email.trim().toLowerCase()
        if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          return problem(409, 'Email is already registered.')
        }
        const user = { userId: nextId('user'), fullName: fullName.trim(), email: normalizedEmail, password, roles: ['Owner'] }
        db.users.push(user)
        saveDb()
        return HttpResponse.json(
          { userId: user.userId, fullName: user.fullName, email: user.email, roles: user.roles },
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
        setSessionUserId(user.userId)
        return HttpResponse.json({ userId: user.userId, roles: user.roles })
      },
      { auth: false },
    ),
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
