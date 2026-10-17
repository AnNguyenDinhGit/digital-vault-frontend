import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { setTokens } from '../utils/tokenStorage'
import { DEMO_ACCOUNT, resetMockDb, setMockHybrid } from './db'
import { forwardToBackend } from './forward'
import { handlers } from './handlers'

// Thay đường gọi BE thật bằng hàm giả để kiểm tra mock chuyển tiếp đúng và ghi nhận kết quả
vi.mock('./forward', () => ({ forwardToBackend: vi.fn() }))

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  forwardToBackend.mockReset()
  await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
  setTokens({ accessToken: 'real.jwt.token', refreshToken: 'r' })
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

const backendReplies = (status, body = null) =>
  forwardToBackend.mockResolvedValue(new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const assign = (executorId, vaultId = 1) => call(axiosClient.put(`/owner/vaults/${vaultId}/executor`, { executorId }))

describe('mock executor assignment in hybrid mode', () => {
  beforeEach(() => setMockHybrid(true))

  it('put_Hybrid_ForwardsRequestWithBearerTokenAndBodyToTheRealBackend', async () => {
    backendReplies(204)
    await assign(2000)
    expect(forwardToBackend).toHaveBeenCalledTimes(1)
    const [request, body] = forwardToBackend.mock.calls[0]
    expect(request.method).toBe('PUT')
    expect(new URL(request.url).pathname).toBe('/api/owner/vaults/1/executor')
    expect(request.headers.get('Authorization')).toBe('Bearer real.jwt.token')
    expect(body).toEqual({ executorId: 2000 })
  })

  it('put_BackendAccepts_Returns204AndRemembersAssignmentWithPlaceholderProfile', async () => {
    backendReplies(204)
    expect((await assign(2000)).status).toBe(204)
    const view = (await axiosClient.get('/owner/vaults/1/executor')).data
    expect(view).toMatchObject({ vaultId: 1, executorId: 2000, fullName: 'Executor #2000', status: 'Active' })
  })

  it('put_BackendAcceptsKnownProfile_UsesMockProfileDetails', async () => {
    backendReplies(204)
    await assign(22)
    expect((await axiosClient.get('/owner/vaults/1/executor')).data).toMatchObject({ executorId: 22, fullName: 'LS. Nguyễn Hải Yến' })
  })

  it('put_BackendRejects_PassesBackendStatusAndBodyAndKeepsPreviousAssignment', async () => {
    backendReplies(409, { status: 409, detail: 'Executor is not available.' })
    const result = await assign(2000)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Executor is not available.')
    expect((await axiosClient.get('/owner/vaults/1/executor')).data.executorId).toBe(5)
  })

  it('put_InvalidBody_Returns400WithoutCallingBackend', async () => {
    expect((await call(axiosClient.put('/owner/vaults/1/executor', { executorId: 'x' }))).status).toBe(400)
    expect(forwardToBackend).not.toHaveBeenCalled()
  })
})

describe('mock executor assignment in full mock mode', () => {
  it('put_FullMock_NeverCallsRealBackend', async () => {
    expect((await assign(22)).status).toBe(204)
    expect(forwardToBackend).not.toHaveBeenCalled()
  })
})
