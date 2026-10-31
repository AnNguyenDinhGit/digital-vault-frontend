import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ApiError } from './axiosClient'
import { completeGoogleLogin, getGoogleChallenge, googleStartUrl, resendGoogleOtp, verifyGoogleOtp } from './googleAuthApi'
import { getTokens, setTokens } from '../utils/tokenStorage'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  sessionStorage.clear()
  localStorage.clear()
})
afterAll(() => server.close())

const TOKENS = { userId: 7, roles: ['Owner'], accessToken: 'access-1', refreshToken: 'refresh-1', refreshTokenExpiresAt: '2026-12-01T00:00:00Z' }

describe('googleStartUrl', () => {
  it('googleStartUrl_Default_PointsAtBackendOriginNotTheFrontendProxy', () => {
    // Cookie phiên Google nằm ở miền của BE nên bước bắt đầu phải đi thẳng tới BE, không qua /api của FE
    expect(googleStartUrl()).toBe('https://vault-owner-be.huydevops.id.vn/api/auth/google/start')
  })
})

describe('getGoogleChallenge', () => {
  it('getGoogleChallenge_Called_SendsCookiesAndReturnsState', async () => {
    let credentials
    server.use(
      http.get('*/api/auth/google/challenge', ({ request }) => {
        credentials = request.credentials
        return HttpResponse.json({ challengeId: 'c'.repeat(32), expiresAt: '2026-10-31T10:00:00Z', requiresOtp: true })
      }),
    )
    await expect(getGoogleChallenge()).resolves.toEqual({ challengeId: 'c'.repeat(32), expiresAt: '2026-10-31T10:00:00Z', requiresOtp: true })
    expect(credentials).toBe('include')
  })

  it('getGoogleChallenge_BackendRejects_ThrowsApiErrorWithStatusAndDetail', async () => {
    server.use(http.get('*/api/auth/google/challenge', () => HttpResponse.json({ status: 400, detail: 'Google sign-in expired or belongs to another browser. Start again.' }, { status: 400 })))
    const error = await getGoogleChallenge().catch((caught) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.message).toContain('expired')
  })
})

describe('completeGoogleLogin', () => {
  it('completeGoogleLogin_Success_StoresTokensAndReturnsUserAndRoles', async () => {
    let seen
    server.use(
      http.post('*/api/auth/google/complete', async ({ request }) => {
        seen = { credentials: request.credentials, vault: request.headers.get('X-Vault-Request'), auth: request.headers.get('Authorization'), body: await request.json() }
        return HttpResponse.json(TOKENS)
      }),
    )
    setTokens({ accessToken: 'stale', refreshToken: 'stale', expiresAt: 'x' })
    await expect(completeGoogleLogin('c'.repeat(32))).resolves.toEqual({ userId: 7, roles: ['Owner'] })
    expect(seen).toEqual({ credentials: 'include', vault: '1', auth: null, body: { challengeId: 'c'.repeat(32) } })
    expect(getTokens()).toMatchObject({ accessToken: 'access-1', refreshToken: 'refresh-1' })
  })

  it('completeGoogleLogin_TwoFactorRequired_ReturnsChallengeAndStoresNoTokens', async () => {
    server.use(
      http.post('*/api/auth/google/complete', () =>
        HttpResponse.json({ requiresTwoFactor: true, challengeId: 'f'.repeat(32), method: 'Email', expiresAt: '2026-10-31T10:05:00Z' }, { status: 202 }),
      ),
    )
    await expect(completeGoogleLogin('c'.repeat(32))).resolves.toEqual({ requiresTwoFactor: true, challengeId: 'f'.repeat(32), method: 'Email', expiresAt: '2026-10-31T10:05:00Z' })
    expect(getTokens()).toBeNull()
  })

  it('completeGoogleLogin_RoleNotAllowed_ThrowsApiError403', async () => {
    server.use(http.post('*/api/auth/google/complete', () => HttpResponse.json({ status: 403, detail: 'This account cannot use public Google sign-in.' }, { status: 403 })))
    const error = await completeGoogleLogin('c'.repeat(32)).catch((caught) => caught)
    expect(error.status).toBe(403)
  })
})

describe('verifyGoogleOtp', () => {
  it('verifyGoogleOtp_ValidCode_PostsTrimmedCodeWithCookiesAndStoresTokens', async () => {
    let seen
    server.use(
      http.post('*/api/auth/google/otp/verify', async ({ request }) => {
        seen = { credentials: request.credentials, vault: request.headers.get('X-Vault-Request'), body: await request.json() }
        return HttpResponse.json(TOKENS)
      }),
    )
    await expect(verifyGoogleOtp('c'.repeat(32), ' 123456 ')).resolves.toEqual({ userId: 7, roles: ['Owner'] })
    expect(seen).toEqual({ credentials: 'include', vault: '1', body: { challengeId: 'c'.repeat(32), code: '123456' } })
    expect(getTokens()).toMatchObject({ accessToken: 'access-1' })
  })

  it('verifyGoogleOtp_WrongCode_ThrowsApiError400', async () => {
    server.use(http.post('*/api/auth/google/otp/verify', () => HttpResponse.json({ status: 400, detail: 'Invalid or expired OTP.' }, { status: 400 })))
    const error = await verifyGoogleOtp('c'.repeat(32), '000000').catch((caught) => caught)
    expect(error.status).toBe(400)
  })
})

describe('resendGoogleOtp', () => {
  it('resendGoogleOtp_Called_ReturnsNewChallengeAndSendsCookies', async () => {
    let seen
    server.use(
      http.post('*/api/auth/google/otp/resend', async ({ request }) => {
        seen = { credentials: request.credentials, vault: request.headers.get('X-Vault-Request'), body: await request.json() }
        return HttpResponse.json({ challengeId: 'n'.repeat(32), expiresAt: '2026-10-31T10:10:00Z' })
      }),
    )
    await expect(resendGoogleOtp('c'.repeat(32))).resolves.toEqual({ challengeId: 'n'.repeat(32), expiresAt: '2026-10-31T10:10:00Z' })
    expect(seen).toEqual({ credentials: 'include', vault: '1', body: { challengeId: 'c'.repeat(32) } })
  })

  it('resendGoogleOtp_TooSoon_ThrowsApiError429', async () => {
    server.use(http.post('*/api/auth/google/otp/resend', () => HttpResponse.json({ status: 429, detail: 'Wait 60 seconds before requesting another OTP.' }, { status: 429 })))
    const error = await resendGoogleOtp('c'.repeat(32)).catch((caught) => caught)
    expect(error.status).toBe(429)
  })
})
