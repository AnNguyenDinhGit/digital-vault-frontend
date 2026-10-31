import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as authApi from '../callapi/authApi'
import * as googleAuthApi from '../callapi/googleAuthApi'
import { useAuth } from '../hooks/useAuth'
import { AuthProvider } from './AuthContext'

vi.mock('../callapi/authApi', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  checkSession: vi.fn(),
  verifyTwoFactor: vi.fn(),
  resendTwoFactor: vi.fn(),
}))
vi.mock('../callapi/googleAuthApi', () => ({
  completeGoogleLogin: vi.fn(),
  verifyGoogleOtp: vi.fn(),
}))
vi.mock('../callapi/axiosClient', () => ({ setUnauthorizedHandler: vi.fn() }))

function Probe() {
  const { user, completeGoogleLogin, verifyGoogleOtp, verifyTwoFactor } = useAuth()
  return (
    <div>
      <p data-testid="user">{user ? `${user.userId}:${user.roles.join(',')}:${user.email}` : 'guest'}</p>
      <button onClick={() => completeGoogleLogin('c'.repeat(32)).then((r) => (window.__result = r)).catch((e) => (window.__error = e))}>complete</button>
      <button onClick={() => verifyGoogleOtp('c'.repeat(32), '123456').then((r) => (window.__result = r)).catch((e) => (window.__error = e))}>otp</button>
      <button onClick={() => verifyTwoFactor('f'.repeat(32), '123456').catch(() => {})}>verify-2fa-no-email</button>
    </div>
  )
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

describe('AuthContext Google login', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    window.__result = undefined
    window.__error = undefined
  })

  it('completeGoogleLogin_Success_StoresUserWithEmailFromServer', async () => {
    googleAuthApi.completeGoogleLogin.mockResolvedValue({ userId: 7, roles: ['Owner'] })
    authApi.checkSession.mockResolvedValue({ userId: 7, fullName: 'An', email: 'an@gmail.com', roles: ['Owner'] })
    renderProvider()
    await userEvent.click(screen.getByText('complete'))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('7:Owner:an@gmail.com'))
    expect(window.__result).toEqual({ userId: 7, roles: ['Owner'], email: 'an@gmail.com' })
  })

  it('completeGoogleLogin_EmailLookupFails_StillLogsInWithEmptyEmail', async () => {
    googleAuthApi.completeGoogleLogin.mockResolvedValue({ userId: 7, roles: ['Owner'] })
    authApi.checkSession.mockRejectedValue(new Error('offline'))
    renderProvider()
    await userEvent.click(screen.getByText('complete'))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('7:Owner:'))
  })

  it('completeGoogleLogin_TwoFactorRequired_ReturnsChallengeAndStaysGuest', async () => {
    const challenge = { requiresTwoFactor: true, challengeId: 'f'.repeat(32), method: 'Email', expiresAt: 'x' }
    googleAuthApi.completeGoogleLogin.mockResolvedValue(challenge)
    renderProvider()
    await userEvent.click(screen.getByText('complete'))
    await waitFor(() => expect(window.__result).toEqual(challenge))
    expect(screen.getByTestId('user')).toHaveTextContent('guest')
    expect(authApi.checkSession).not.toHaveBeenCalled()
  })

  it('completeGoogleLogin_Fails_StaysGuestAndRejects', async () => {
    googleAuthApi.completeGoogleLogin.mockRejectedValue(Object.assign(new Error('x'), { status: 403 }))
    renderProvider()
    await userEvent.click(screen.getByText('complete'))
    await waitFor(() => expect(window.__error?.status).toBe(403))
    expect(screen.getByTestId('user')).toHaveTextContent('guest')
  })

  it('verifyGoogleOtp_Success_StoresUserWithEmailFromServer', async () => {
    googleAuthApi.verifyGoogleOtp.mockResolvedValue({ userId: 9, roles: ['Owner'] })
    authApi.checkSession.mockResolvedValue({ userId: 9, fullName: 'Mới', email: 'moi@gmail.com', roles: ['Owner'] })
    renderProvider()
    await userEvent.click(screen.getByText('otp'))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('9:Owner:moi@gmail.com'))
    expect(googleAuthApi.verifyGoogleOtp).toHaveBeenCalledWith('c'.repeat(32), '123456')
  })

  it('verifyTwoFactor_NoEmailGiven_LooksItUpFromServerSoGoogleUsersHaveOne', async () => {
    authApi.verifyTwoFactor.mockResolvedValue({ userId: 7, roles: ['Owner'] })
    authApi.checkSession.mockResolvedValue({ userId: 7, fullName: 'An', email: 'an@gmail.com', roles: ['Owner'] })
    renderProvider()
    await userEvent.click(screen.getByText('verify-2fa-no-email'))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('7:Owner:an@gmail.com'))
  })
})
