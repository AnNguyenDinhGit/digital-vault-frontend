import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { getSessionUserId, resetMockDb, setMockHybrid, setSessionUserId } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetMockDb()
  sessionStorage.removeItem('aeterna.user')
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const storeUser = (userId) => sessionStorage.setItem('aeterna.user', JSON.stringify({ userId, roles: ['Owner'], email: 'a@b.co' }))

describe('getSessionUserId in hybrid mode', () => {
  it('getSessionUserId_HybridWithStoredUser_ReturnsStoredUserId', () => {
    setMockHybrid(true)
    storeUser(42)
    expect(getSessionUserId()).toBe(42)
  })

  it('getSessionUserId_NotHybridWithStoredUser_ReturnsNull', () => {
    storeUser(42)
    expect(getSessionUserId()).toBeNull()
  })

  it('getSessionUserId_HybridAndMockSession_PrefersMockSession', () => {
    setMockHybrid(true)
    storeUser(42)
    setSessionUserId(1)
    expect(getSessionUserId()).toBe(1)
  })

  it('getSessionUserId_HybridWithBrokenStoredUser_ReturnsNull', () => {
    setMockHybrid(true)
    sessionStorage.setItem('aeterna.user', '{khong-phai-json')
    expect(getSessionUserId()).toBeNull()
  })

  it('getSessionUserId_HybridWithoutUserId_ReturnsNull', () => {
    setMockHybrid(true)
    sessionStorage.setItem('aeterna.user', JSON.stringify({ roles: ['Owner'] }))
    expect(getSessionUserId()).toBeNull()
  })

  it('resetMockDb_Called_TurnsHybridOff', () => {
    setMockHybrid(true)
    resetMockDb()
    storeUser(42)
    expect(getSessionUserId()).toBeNull()
  })
})

describe('mock handlers in hybrid mode', () => {
  it('ownerEndpoint_HybridWithUserUnknownToMock_SkipsRoleCheck', async () => {
    // Người dùng thật của BE (id 42) không có trong dữ liệu mock nên không được trả 403
    setMockHybrid(true)
    storeUser(42)
    const response = await axiosClient.get('/owner/vaults')
    expect(response.status).toBe(200)
    expect(response.data).toEqual([])
  })

  it('ownerEndpoint_NotHybridWithUserUnknownToMock_Returns401', async () => {
    storeUser(42)
    await expect(axiosClient.get('/owner/vaults')).rejects.toMatchObject({ status: 401 })
  })
})
