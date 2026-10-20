import { http, HttpResponse } from 'msw'
import { getDb, nextId, saveDb } from './db'
import { adminRoute, hasUnknownFields, isBlank, problem } from './helpers'

// Mock cổng System Admin, bám AdminController/AdminService của BE
const VALID_ROLES = ['Admin', 'Owner', 'Executor', 'Beneficiary', 'LegalVerifier']
const VALID_STATUSES = ['Active', 'Disabled', 'Locked']
// Tài khoản seed không lưu ngày tạo nên dùng mốc cố định
const SEED_CREATED_AT = '2026-01-01T00:00:00.000Z'

// ManagementService.Paging của BE: page >= 1, pageSize trong 1..100
function readPaging(url) {
  const page = Number(url.searchParams.get('page') ?? 1)
  const pageSize = Number(url.searchParams.get('pageSize') ?? 20)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return null
  return { page, pageSize }
}

const userDto = (user) => ({
  userId: user.userId,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone ?? null,
  identityNumber: user.identityNumber ?? null,
  status: user.status ?? 'Active',
  roles: user.roles,
  createdAt: user.createdAt ?? SEED_CREATED_AT,
  updatedAt: user.updatedAt ?? user.createdAt ?? SEED_CREATED_AT,
})

// Ghi vào nhật ký kiểm toán như BE (AuditLog) mỗi khi Admin thay đổi người dùng
function audit(adminUserId, action, entityId) {
  const db = getDb()
  db.activityLogs.push({
    logId: nextId('log'),
    userId: adminUserId,
    action,
    entityType: 'User',
    entityId,
    timestamp: new Date().toISOString(),
    ipAddress: '127.0.0.1',
    result: 'Success',
  })
}

// Vai trò không có trong hệ thống bị BE bỏ qua; trùng lặp được gộp
const cleanRoles = (roles) => [...new Set(roles)].filter((role) => VALID_ROLES.includes(role))

export const adminHandlers = [
  http.get(
    '*/api/admin/users',
    adminRoute(({ request }) => {
      const url = new URL(request.url)
      const paging = readPaging(url)
      if (!paging) return problem(400, 'Invalid paging parameters.')
      const role = url.searchParams.get('role')
      const status = url.searchParams.get('status')
      const items = getDb()
        .users.map(userDto)
        .filter((user) => !role?.trim() || user.roles.includes(role))
        .filter((user) => !status?.trim() || user.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.userId - a.userId)
        .slice((paging.page - 1) * paging.pageSize, paging.page * paging.pageSize)
      return HttpResponse.json({ ...paging, items })
    }),
  ),

  http.post(
    '*/api/admin/users',
    adminRoute(({ userId, body }) => {
      if (hasUnknownFields(body, ['fullName', 'email', 'password', 'phone', 'identityNumber', 'roles'])) return problem(400, 'Unknown fields.')
      const { fullName, email, password, phone, identityNumber, roles } = body ?? {}
      if (isBlank(fullName) || fullName.length > 100) return problem(400, 'FullName is required (max 100).')
      if (isBlank(email) || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return problem(400, 'Email is invalid.')
      if (typeof password !== 'string' || password.length < 12 || password.length > 1024) return problem(400, 'Password must be 12 to 1024 characters.')
      if (!Array.isArray(roles)) return problem(400, 'Roles is required.')

      const db = getDb()
      const normalizedEmail = email.trim().toLowerCase()
      if (db.users.some((user) => user.email.toLowerCase() === normalizedEmail)) return problem(409, 'Email đã được sử dụng.')
      const now = new Date().toISOString()
      const user = {
        userId: nextId('user'),
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: isBlank(phone) ? null : phone.trim(),
        identityNumber: isBlank(identityNumber) ? null : identityNumber.trim(),
        password,
        roles: cleanRoles(roles),
        status: 'Active',
        createdAt: now,
        updatedAt: now,
      }
      db.users.push(user)
      audit(userId, 'AdminCreateUser', user.userId)
      saveDb()
      return HttpResponse.json(userDto(user), { status: 201 })
    }),
  ),

  http.put(
    '*/api/admin/users/:userId/roles',
    adminRoute(({ userId, params, body }) => {
      if (hasUnknownFields(body, ['roles']) || !Array.isArray(body?.roles)) return problem(400, 'Roles is required.')
      const target = getDb().users.find((user) => user.userId === Number(params.userId))
      if (!target) return problem(404, 'Không tìm thấy người dùng.')
      target.roles = cleanRoles(body.roles)
      target.updatedAt = new Date().toISOString()
      audit(userId, 'UpdateUserRoles', target.userId)
      saveDb()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.put(
    '*/api/admin/users/:userId/status',
    adminRoute(({ userId, params, body }) => {
      if (hasUnknownFields(body, ['status']) || !VALID_STATUSES.includes(body?.status)) return problem(400, 'Status must be Active, Disabled or Locked.')
      const target = getDb().users.find((user) => user.userId === Number(params.userId))
      if (!target) return problem(404, 'Không tìm thấy người dùng.')
      target.status = body.status
      target.updatedAt = new Date().toISOString()
      audit(userId, 'UpdateUserStatus', target.userId)
      saveDb()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    '*/api/admin/audit-logs',
    adminRoute(({ request }) => {
      const url = new URL(request.url)
      const paging = readPaging(url)
      if (!paging) return problem(400, 'Invalid paging parameters.')
      const action = url.searchParams.get('action')
      const db = getDb()
      const items = db.activityLogs
        .filter((log) => !action?.trim() || log.action === action)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.logId - a.logId)
        .slice((paging.page - 1) * paging.pageSize, paging.page * paging.pageSize)
        .map((log) => ({
          logId: log.logId,
          userId: log.userId ?? null,
          userEmail: db.users.find((user) => user.userId === log.userId)?.email ?? null,
          action: log.action,
          entityType: log.entityType ?? null,
          entityId: log.entityId ?? null,
          result: log.result,
          ipaddress: log.ipAddress ?? null,
          timestamp: log.timestamp,
        }))
      return HttpResponse.json({ ...paging, items })
    }),
  ),
]
