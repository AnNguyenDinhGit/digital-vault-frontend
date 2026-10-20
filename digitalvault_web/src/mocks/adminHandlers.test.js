import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, resetMockDb } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)
const admin = ROLE_ACCOUNTS.find((account) => account.role === 'Admin')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await axiosClient.post('/auth/login', { email: admin.email, password: admin.password })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const call = async (promise) => {
  try {
    const response = await promise
    return { status: response.status, data: response.data }
  } catch (error) {
    return { status: error.status, message: error.message }
  }
}

const newUser = (overrides = {}) => ({
  fullName: 'Phạm Thu Hà',
  email: 'Ha.Pham@Example.com',
  password: 'MatKhau@12345',
  roles: ['Executor', 'Executor', 'Khong.Ton.Tai'],
  ...overrides,
})

describe('mock admin access control', () => {
  it('getUsers_OwnerRole_Returns403', async () => {
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    expect((await call(axiosClient.get('/admin/users'))).status).toBe(403)
  })
})

describe('mock admin users list', () => {
  it('getUsers_Default_ReturnsPageDtoWithUserFields', async () => {
    const { status, data } = await call(axiosClient.get('/admin/users'))
    expect(status).toBe(200)
    expect(data).toMatchObject({ page: 1, pageSize: 20 })
    expect(data.items).toHaveLength(8)
    expect(data.items[0]).toEqual(
      expect.objectContaining({ userId: expect.any(Number), fullName: expect.any(String), status: 'Active', roles: expect.any(Array), createdAt: expect.any(String) }),
    )
  })

  it('getUsers_PageSize_SlicesPages', async () => {
    const first = (await axiosClient.get('/admin/users', { params: { page: 1, pageSize: 5 } })).data.items
    const second = (await axiosClient.get('/admin/users', { params: { page: 2, pageSize: 5 } })).data.items
    expect(first).toHaveLength(5)
    expect(second).toHaveLength(3)
    expect(first.map((user) => user.userId)).not.toContain(second[0].userId)
  })

  it('getUsers_InvalidPaging_Returns400', async () => {
    expect((await call(axiosClient.get('/admin/users', { params: { page: 0 } }))).status).toBe(400)
    expect((await call(axiosClient.get('/admin/users', { params: { pageSize: 101 } }))).status).toBe(400)
  })

  it('getUsers_RoleFilter_ReturnsOnlyThatRole', async () => {
    const { data } = await axiosClient.get('/admin/users', { params: { role: 'Executor' } })
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items.every((user) => user.roles.includes('Executor'))).toBe(true)
  })

  it('getUsers_StatusFilter_ReturnsOnlyThatStatus', async () => {
    await axiosClient.put('/admin/users/2/status', { status: 'Locked' })
    const { data } = await axiosClient.get('/admin/users', { params: { status: 'Locked' } })
    expect(data.items.map((user) => user.userId)).toEqual([2])
  })
})

describe('mock admin create user', () => {
  it('createUser_Valid_Returns201WithNormalizedEmailAndKnownRolesOnly', async () => {
    const { status, data } = await call(axiosClient.post('/admin/users', newUser()))
    expect(status).toBe(201)
    expect(data).toMatchObject({ email: 'ha.pham@example.com', status: 'Active', roles: ['Executor'] })
    expect(data).not.toHaveProperty('password')
  })

  it('createUser_NewestFirstInList', async () => {
    const { data: created } = await axiosClient.post('/admin/users', newUser())
    const { data } = await axiosClient.get('/admin/users')
    expect(data.items[0].userId).toBe(created.userId)
  })

  it('createUser_CreatedAccount_CanLogIn', async () => {
    await axiosClient.post('/admin/users', newUser({ roles: ['Owner'] }))
    const result = await call(axiosClient.post('/auth/login', { email: 'ha.pham@example.com', password: 'MatKhau@12345' }))
    expect(result.status).toBe(200)
  })

  it('createUser_DuplicateEmail_Returns409', async () => {
    const result = await call(axiosClient.post('/admin/users', newUser({ email: 'LONG.TRAN@example.com' })))
    expect(result.status).toBe(409)
    expect(result.message).toBe('Email đã được sử dụng.')
  })

  it.each([
    ['ShortPassword', { password: 'ngan' }],
    ['InvalidEmail', { email: 'khong-hop-le' }],
    ['BlankName', { fullName: ' ' }],
    ['MissingRoles', { roles: undefined }],
    ['UnknownField', { isAdmin: true }],
  ])('createUser_%s_Returns400', async (_name, overrides) => {
    expect((await call(axiosClient.post('/admin/users', newUser(overrides)))).status).toBe(400)
  })
})

describe('mock admin update roles and status', () => {
  it('updateRoles_Valid_ReplacesRolesWith204', async () => {
    expect((await call(axiosClient.put('/admin/users/2/roles', { roles: ['Executor'] }))).status).toBe(204)
    const { data } = await axiosClient.get('/admin/users', { params: { role: 'Executor' } })
    expect(data.items.find((user) => user.userId === 2).roles).toEqual(['Executor'])
  })

  it('updateRoles_UnknownUser_Returns404', async () => {
    expect((await call(axiosClient.put('/admin/users/999/roles', { roles: ['Owner'] }))).status).toBe(404)
  })

  it('updateRoles_MissingRoles_Returns400', async () => {
    expect((await call(axiosClient.put('/admin/users/2/roles', {}))).status).toBe(400)
  })

  it('updateStatus_Valid_Returns204AndPersists', async () => {
    expect((await call(axiosClient.put('/admin/users/2/status', { status: 'Disabled' }))).status).toBe(204)
    const { data } = await axiosClient.get('/admin/users')
    expect(data.items.find((user) => user.userId === 2).status).toBe('Disabled')
  })

  it('updateStatus_InvalidValue_Returns400', async () => {
    expect((await call(axiosClient.put('/admin/users/2/status', { status: 'Banned' }))).status).toBe(400)
  })

  it('updateStatus_UnknownUser_Returns404', async () => {
    expect((await call(axiosClient.put('/admin/users/999/status', { status: 'Locked' }))).status).toBe(404)
  })
})

describe('mock admin audit logs', () => {
  it('getAuditLogs_Default_ReturnsPageDtoNewestFirstWithActorEmail', async () => {
    const { status, data } = await call(axiosClient.get('/admin/audit-logs'))
    expect(status).toBe(200)
    expect(data).toMatchObject({ page: 1, pageSize: 20 })
    const times = data.items.map((log) => log.timestamp)
    expect(times).toEqual([...times].sort().reverse())
    expect(data.items[0]).toEqual(expect.objectContaining({ logId: expect.any(Number), action: expect.any(String), result: expect.any(String) }))
    expect(data.items.some((log) => log.userEmail === 'owner@example.com')).toBe(true)
  })

  it('getAuditLogs_ActionFilter_ReturnsExactActionOnly', async () => {
    const { data } = await axiosClient.get('/admin/audit-logs', { params: { action: 'CreateAsset' } })
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items.every((log) => log.action === 'CreateAsset')).toBe(true)
  })

  it('getAuditLogs_PageSize_SlicesPages', async () => {
    const first = (await axiosClient.get('/admin/audit-logs', { params: { page: 1, pageSize: 5 } })).data.items
    const second = (await axiosClient.get('/admin/audit-logs', { params: { page: 2, pageSize: 5 } })).data.items
    expect(first).toHaveLength(5)
    expect(second.map((log) => log.logId)).not.toContain(first[0].logId)
  })

  it('getAuditLogs_InvalidPaging_Returns400', async () => {
    expect((await call(axiosClient.get('/admin/audit-logs', { params: { pageSize: 0 } }))).status).toBe(400)
  })

  it('getAuditLogs_OwnerRole_Returns403', async () => {
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    expect((await call(axiosClient.get('/admin/audit-logs'))).status).toBe(403)
  })

  it('adminActions_AreRecordedInAuditLog', async () => {
    await axiosClient.post('/admin/users', newUser())
    await axiosClient.put('/admin/users/2/roles', { roles: ['Owner'] })
    await axiosClient.put('/admin/users/2/status', { status: 'Locked' })
    const { data } = await axiosClient.get('/admin/audit-logs', { params: { pageSize: 3 } })
    expect(data.items.map((log) => log.action)).toEqual(['UpdateUserStatus', 'UpdateUserRoles', 'AdminCreateUser'])
    expect(data.items.every((log) => log.userEmail === 'admin@example.com')).toBe(true)
  })
})
