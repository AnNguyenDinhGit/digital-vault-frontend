import { clearTokens, getTokens, setTokens } from '../utils/tokenStorage'
import axiosClient from './axiosClient'
import { checkSession, login, logout, register, requestPasswordReset, resetPassword, verifyResetOtp } from './authApi'

vi.mock('./axiosClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

describe('authApi', () => {
  beforeEach(() => setTokens({ accessToken: 'a', refreshToken: 'r' }))

  afterEach(() => {
    vi.clearAllMocks()
    clearTokens()
  })

  it('login_ResponseWithTokens_StoresThemAndReturnsOnlyUserAndRoles', async () => {
    axiosClient.post.mockResolvedValue({
      data: { userId: 5, roles: ['Owner'], accessToken: 'acc', refreshToken: 'ref', expiresAt: '2026-10-21T00:00:00Z' },
    })
    await expect(login('an@example.com', 'x')).resolves.toEqual({ userId: 5, roles: ['Owner'] })
    expect(getTokens()).toEqual({ accessToken: 'acc', refreshToken: 'ref', expiresAt: '2026-10-21T00:00:00Z' })
  })

  it('login_Called_DropsOldTokensBeforeRequest', async () => {
    let tokensDuringRequest = 'not-called'
    axiosClient.post.mockImplementation(async () => {
      tokensDuringRequest = getTokens()
      return { data: { userId: 5, roles: [] } }
    })
    await login('an@example.com', 'x')
    expect(tokensDuringRequest).toBeNull()
    expect(getTokens()).toBeNull()
  })

  it('login_Rejected_LeavesNoTokens', async () => {
    axiosClient.post.mockRejectedValue({ status: 401 })
    await expect(login('an@example.com', 'x')).rejects.toEqual({ status: 401 })
    expect(getTokens()).toBeNull()
  })

  it('logout_ServerFails_StillClearsTokensAndThrows', async () => {
    axiosClient.post.mockRejectedValue({ status: 401 })
    await expect(logout()).rejects.toEqual({ status: 401 })
    expect(getTokens()).toBeNull()
  })

  it('logout_Success_ClearsTokens', async () => {
    axiosClient.post.mockResolvedValue({ status: 204 })
    await logout()
    expect(getTokens()).toBeNull()
  })

  it('checkSession_NoTokens_ReturnsFalseWithoutCallingApi', async () => {
    clearTokens()
    await expect(checkSession()).resolves.toBe(false)
    expect(axiosClient.get).not.toHaveBeenCalled()
  })

  it('login_ValidCredentials_PostsAndReturnsUser', async () => {
    axiosClient.post.mockResolvedValue({ data: { userId: 7, roles: ['Owner'] } })
    const user = await login('an@example.com', 'Password123456')
    expect(axiosClient.post).toHaveBeenCalledWith(
      '/auth/login',
      { email: 'an@example.com', password: 'Password123456' },
      { skipAuthRedirect: true },
    )
    expect(user).toEqual({ userId: 7, roles: ['Owner'] })
  })

  it('requestPasswordReset_Email_PostsTrimmedEmailWithoutAuthRedirect', async () => {
    axiosClient.post.mockResolvedValue({ data: { maskedEmail: 'a***n@x.co' } })
    await expect(requestPasswordReset(' an@x.co ')).resolves.toEqual({ maskedEmail: 'a***n@x.co' })
    expect(axiosClient.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'an@x.co' }, { skipAuthRedirect: true })
  })

  it('verifyResetOtp_EmailAndOtp_PostsTrimmedValues', async () => {
    axiosClient.post.mockResolvedValue({ data: { resetToken: 'abc' } })
    await expect(verifyResetOtp(' an@x.co ', ' 123456 ')).resolves.toEqual({ resetToken: 'abc' })
    expect(axiosClient.post).toHaveBeenCalledWith('/auth/verify-reset-otp', { email: 'an@x.co', otp: '123456' }, { skipAuthRedirect: true })
  })

  it('resetPassword_Values_PostsOnlyContractFields', async () => {
    axiosClient.post.mockResolvedValue({ data: undefined })
    await resetPassword({ resetToken: 't', newPassword: 'a', confirmPassword: 'a', email: 'x' })
    expect(axiosClient.post).toHaveBeenCalledWith('/auth/reset-password', { resetToken: 't', newPassword: 'a', confirmPassword: 'a' }, { skipAuthRedirect: true })
  })

  it('register_WithPhone_SendsOnlyContractFields', async () => {
    axiosClient.post.mockResolvedValue({ data: { userId: 1 } })
    await register({
      fullName: 'Nguyen Van An',
      email: 'an@example.com',
      phone: '0901234567',
      password: 'Password123456',
      confirmPassword: 'Password123456',
      acceptTerms: true,
    })
    expect(axiosClient.post).toHaveBeenCalledWith(
      '/auth/register',
      {
        fullName: 'Nguyen Van An',
        email: 'an@example.com',
        phone: '0901234567',
        password: 'Password123456',
        confirmPassword: 'Password123456',
      },
      { skipAuthRedirect: true },
    )
  })

  it('register_WithIdentityNumber_SendsNormalizedIdentityNumber', async () => {
    axiosClient.post.mockResolvedValue({ data: { userId: 1 } })
    await register({
      fullName: 'A',
      email: 'a@b.co',
      phone: '',
      identityNumber: ' 079 094 004521 ',
      password: 'x',
      confirmPassword: 'x',
    })
    expect(axiosClient.post.mock.calls[0][1].identityNumber).toBe('079094004521')
  })

  it('register_BlankIdentityNumber_OmitsTheField', async () => {
    axiosClient.post.mockResolvedValue({ data: { userId: 1 } })
    await register({ fullName: 'A', email: 'a@b.co', phone: '', identityNumber: '   ', password: 'x', confirmPassword: 'x' })
    expect(axiosClient.post.mock.calls[0][1]).not.toHaveProperty('identityNumber')
  })

  it('register_EmptyPhone_SendsNullPhone', async () => {
    axiosClient.post.mockResolvedValue({ data: { userId: 1 } })
    await register({ fullName: 'A', email: 'a@b.co', phone: '  ', password: 'x', confirmPassword: 'x' })
    expect(axiosClient.post.mock.calls[0][1].phone).toBeNull()
  })

  it('logout_Called_PostsLogout', async () => {
    axiosClient.post.mockResolvedValue({ status: 204 })
    await logout()
    expect(axiosClient.post).toHaveBeenCalledWith('/auth/logout', null, { skipAuthRedirect: true })
  })

  it('checkSession_Ok_ReturnsTrue', async () => {
    axiosClient.get.mockResolvedValue({ data: [] })
    await expect(checkSession()).resolves.toBe(true)
  })

  it('checkSession_Forbidden_ReturnsTrue', async () => {
    axiosClient.get.mockRejectedValue({ status: 403 })
    await expect(checkSession()).resolves.toBe(true)
  })

  it('checkSession_Unauthorized_ReturnsFalse', async () => {
    axiosClient.get.mockRejectedValue({ status: 401 })
    await expect(checkSession()).resolves.toBe(false)
  })

  it('checkSession_NetworkError_Throws', async () => {
    axiosClient.get.mockRejectedValue({ status: 0 })
    await expect(checkSession()).rejects.toEqual({ status: 0 })
  })
})
