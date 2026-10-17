import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, getDb, getSessionUserId, resetMockDb, setSessionUserId } from './db'
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

const loginRequest = () => call(axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password }))
const login = async () => (await loginRequest()).data
const refresh = (body) => call(axiosClient.post('/auth/refresh-token', body))
const enableTwoFactor = () => {
  getDb().security[DEMO_ACCOUNT.userId] = { ...getDb().security[DEMO_ACCOUNT.userId], twoFactorEnabled: true }
}
const verify = (body) => call(axiosClient.post('/auth/2fa/verify', body))
const resend = (body) => call(axiosClient.post('/auth/2fa/resend', body))

describe('mock login tokens', () => {
  it('login_DemoAccount_ReturnsTokenDtoLikeBackend', async () => {
    const data = await login()
    expect(data).toMatchObject({ userId: 1, roles: ['Owner'], tokenType: 'Bearer', expiresIn: 900 })
    expect(typeof data.accessToken).toBe('string')
    expect(typeof data.refreshToken).toBe('string')
    expect(new Date(data.refreshTokenExpiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('login_TwiceInARow_IssuesDifferentTokens', async () => {
    const first = await login()
    const second = await login()
    expect(second.accessToken).not.toBe(first.accessToken)
    expect(second.refreshToken).not.toBe(first.refreshToken)
  })
})

describe('mock refresh token', () => {
  it('post_ValidRefreshToken_ReturnsNewPair', async () => {
    const tokens = await login()
    const result = await refresh({ refreshToken: tokens.refreshToken })
    expect(result.status).toBe(200)
    expect(result.data.accessToken).not.toBe(tokens.accessToken)
    expect(result.data.refreshToken).not.toBe(tokens.refreshToken)
    expect(new Date(result.data.refreshTokenExpiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('post_UsedTwice_SecondIsRejectedBecauseOfRotation', async () => {
    const tokens = await login()
    const body = { refreshToken: tokens.refreshToken }
    await refresh(body)
    expect((await refresh(body)).status).toBe(401)
  })

  it('post_NewRefreshTokenCanBeUsedAgain', async () => {
    const tokens = await login()
    const next = (await refresh({ refreshToken: tokens.refreshToken })).data
    expect((await refresh({ refreshToken: next.refreshToken })).status).toBe(200)
  })

  it('post_UnknownRefreshToken_Returns401', async () => {
    expect((await refresh({ refreshToken: 'khong-co' })).status).toBe(401)
  })

  it.each([[{}], [{ refreshToken: '' }], [{ refreshToken: 'r', accessToken: 'a' }]])('post_InvalidBody_Returns400', async (body) => {
    expect((await refresh(body)).status).toBe(400)
  })
})

describe('mock me', () => {
  it('get_LoggedIn_ReturnsProfile', async () => {
    await login()
    const result = await call(axiosClient.get('/auth/me'))
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ userId: 1, fullName: 'Nguyễn Văn An', email: 'owner@example.com', roles: ['Owner'], status: 'Active' })
  })

  it('get_NotLoggedIn_Returns401', async () => {
    expect((await call(axiosClient.get('/auth/me'))).status).toBe(401)
  })
})

describe('mock two-factor login', () => {
  it('login_TwoFactorEnabled_Returns202ChallengeWithoutTokens', async () => {
    enableTwoFactor()
    const result = await loginRequest()
    expect(result.status).toBe(202)
    expect(result.data).toMatchObject({ method: 'Email', requiresTwoFactor: true })
    expect(result.data.challengeId).toMatch(/^[0-9a-f]{32}$/)
    expect(result.data.mockCode).toMatch(/^\d{6}$/)
    expect(result.data.accessToken).toBeUndefined()
    expect(getSessionUserId()).toBeNull()
  })

  it('verify_CorrectCode_Returns200TokenDtoAndOpensSession', async () => {
    enableTwoFactor()
    const challenge = (await loginRequest()).data
    const result = await verify({ challengeId: challenge.challengeId, code: challenge.mockCode })
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ userId: 1, roles: ['Owner'], tokenType: 'Bearer' })
    expect(typeof result.data.refreshToken).toBe('string')
    expect(getSessionUserId()).toBe(1)
  })

  it('verify_WrongCode_Returns400AndNoSession', async () => {
    enableTwoFactor()
    const challenge = (await loginRequest()).data
    const wrong = challenge.mockCode === '000000' ? '111111' : '000000'
    expect((await verify({ challengeId: challenge.challengeId, code: wrong })).status).toBe(400)
    expect(getSessionUserId()).toBeNull()
  })

  it('verify_ChallengeUsedTwice_SecondReturns400', async () => {
    enableTwoFactor()
    const challenge = (await loginRequest()).data
    await verify({ challengeId: challenge.challengeId, code: challenge.mockCode })
    expect((await verify({ challengeId: challenge.challengeId, code: challenge.mockCode })).status).toBe(400)
  })

  it('verify_FiveWrongAttempts_LocksChallengeEvenForCorrectCode', async () => {
    enableTwoFactor()
    const challenge = (await loginRequest()).data
    const wrong = challenge.mockCode === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i += 1) await verify({ challengeId: challenge.challengeId, code: wrong })
    expect((await verify({ challengeId: challenge.challengeId, code: challenge.mockCode })).status).toBe(400)
  })

  it('verify_ExpiredChallenge_Returns400', async () => {
    enableTwoFactor()
    const challenge = (await loginRequest()).data
    getDb().twoFactorChallenges[challenge.challengeId].expiresAt = Date.now() - 1000
    expect((await verify({ challengeId: challenge.challengeId, code: challenge.mockCode })).status).toBe(400)
  })

  it.each([[{}], [{ challengeId: 'short', code: '123456' }], [{ challengeId: 'a'.repeat(32), code: 'abcdef' }], [{ challengeId: 'a'.repeat(32), code: '123456', x: 1 }]])(
    'verify_InvalidBody_Returns400',
    async (body) => {
      expect((await verify(body)).status).toBe(400)
    },
  )

  it('resend_RightAfterLogin_Returns429BecauseOfCooldown', async () => {
    enableTwoFactor()
    const challenge = (await loginRequest()).data
    expect((await resend({ challengeId: challenge.challengeId })).status).toBe(429)
  })

  it('resend_AfterCooldown_ReturnsNewChallengeAndCancelsOldOne', async () => {
    enableTwoFactor()
    const challenge = (await loginRequest()).data
    getDb().twoFactorChallenges[challenge.challengeId].lastSentAt = Date.now() - 61_000
    const result = await resend({ challengeId: challenge.challengeId })
    expect(result.status).toBe(200)
    expect(result.data.challengeId).not.toBe(challenge.challengeId)
    expect(result.data.mockCode).toMatch(/^\d{6}$/)
    expect((await verify({ challengeId: challenge.challengeId, code: challenge.mockCode })).status).toBe(400)
    expect((await verify({ challengeId: result.data.challengeId, code: result.data.mockCode })).status).toBe(200)
  })

  it('resend_UnknownChallenge_Returns400', async () => {
    expect((await resend({ challengeId: 'a'.repeat(32) })).status).toBe(400)
  })

  it('login_TwoFactorDisabled_StillReturnsTokensDirectly', async () => {
    setSessionUserId(null)
    expect((await loginRequest()).status).toBe(200)
  })
})
