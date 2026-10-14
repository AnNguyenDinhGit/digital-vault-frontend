import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, resetMockDb } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetMockDb())
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

const login = async () => (await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })).data
const refresh = (body) => call(axiosClient.post('/auth/refresh-token', body))

describe('mock login tokens', () => {
  it('login_DemoAccount_ReturnsTokenPairLikeBackend', async () => {
    const data = await login()
    expect(data).toMatchObject({ userId: 1, roles: ['Owner'] })
    expect(typeof data.accessToken).toBe('string')
    expect(typeof data.refreshToken).toBe('string')
    expect(new Date(data.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('login_TwiceInARow_IssuesDifferentTokens', async () => {
    const first = await login()
    const second = await login()
    expect(second.accessToken).not.toBe(first.accessToken)
    expect(second.refreshToken).not.toBe(first.refreshToken)
  })
})

describe('mock refresh token', () => {
  it('post_ValidPair_ReturnsNewPair', async () => {
    const tokens = await login()
    const result = await refresh({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
    expect(result.status).toBe(200)
    expect(result.data.accessToken).not.toBe(tokens.accessToken)
    expect(result.data.refreshToken).not.toBe(tokens.refreshToken)
    expect(new Date(result.data.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('post_UsedTwice_SecondIsRejectedBecauseOfRotation', async () => {
    const tokens = await login()
    const body = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
    await refresh(body)
    expect((await refresh(body)).status).toBe(401)
  })

  it('post_NewRefreshTokenCanBeUsedAgain', async () => {
    const tokens = await login()
    const next = (await refresh({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })).data
    expect((await refresh({ accessToken: next.accessToken, refreshToken: next.refreshToken })).status).toBe(200)
  })

  it('post_UnknownRefreshToken_Returns401', async () => {
    const tokens = await login()
    expect((await refresh({ accessToken: tokens.accessToken, refreshToken: 'khong-co' })).status).toBe(401)
  })

  it.each([[{}], [{ accessToken: 'a' }], [{ refreshToken: 'r' }], [{ accessToken: '', refreshToken: '' }]])('post_MissingFields_Returns400', async (body) => {
    expect((await refresh(body)).status).toBe(400)
  })
})
