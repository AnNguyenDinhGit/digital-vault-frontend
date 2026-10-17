import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as authApi from '../callapi/authApi'
import { setUnauthorizedHandler } from '../callapi/axiosClient'
import { AuthProvider } from './AuthContext'
import { USER_STORAGE_KEY } from './authContextInstance'
import { useAuth } from '../hooks/useAuth'

vi.mock('../callapi/authApi', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  checkSession: vi.fn(),
  verifyTwoFactor: vi.fn(),
  resendTwoFactor: vi.fn(),
}))
vi.mock('../callapi/axiosClient', () => ({
  setUnauthorizedHandler: vi.fn(),
}))

// Component thử để đọc giá trị từ context
function Probe() {
  const { user, isChecking, login, logout, hasRole, verifyTwoFactor, resendTwoFactor } = useAuth()
  if (isChecking) return <p>checking</p>
  return (
    <div>
      <p data-testid="user">{user ? `${user.userId}:${user.roles.join(',')}` : 'guest'}</p>
      <p data-testid="owner">{hasRole('Owner') ? 'owner' : 'not-owner'}</p>
      <button onClick={() => login('an@example.com', 'Password123456').catch(() => {})}>login</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => login('an@example.com', 'x').then((r) => window.__loginResult = r).catch(() => {})}>login-raw</button>
      <button onClick={() => verifyTwoFactor('c'.repeat(32), '123456', 'an@example.com').catch(() => {})}>verify-2fa</button>
      <button onClick={() => resendTwoFactor('c'.repeat(32)).then((r) => window.__resendResult = r)}>resend-2fa</button>
    </div>
  )
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('init_NoStoredUser_IsGuestWithoutCheckingSession', async () => {
    renderProvider()
    expect(await screen.findByTestId('user')).toHaveTextContent('guest')
    expect(authApi.checkSession).not.toHaveBeenCalled()
  })

  it('login_Success_StoresUser', async () => {
    authApi.login.mockResolvedValue({ userId: 7, roles: ['Owner'] })
    renderProvider()
    await userEvent.click(await screen.findByText('login'))
    expect(screen.getByTestId('user')).toHaveTextContent('7:Owner')
    expect(screen.getByTestId('owner')).toHaveTextContent('owner')
    // Login response của BE không có email nên lưu email người dùng đã nhập để hiển thị
    expect(JSON.parse(sessionStorage.getItem(USER_STORAGE_KEY))).toEqual({
      userId: 7,
      roles: ['Owner'],
      email: 'an@example.com',
    })
  })

  it('login_TwoFactorRequired_ReturnsChallengeAndStaysGuest', async () => {
    const challenge = { requiresTwoFactor: true, challengeId: 'c'.repeat(32), method: 'Email', expiresAt: 'x' }
    authApi.login.mockResolvedValue(challenge)
    renderProvider()
    await userEvent.click(await screen.findByText('login-raw'))
    await waitFor(() => expect(window.__loginResult).toEqual(challenge))
    expect(screen.getByTestId('user')).toHaveTextContent('guest')
    expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBeNull()
  })

  it('verifyTwoFactor_Success_StoresUserWithEmail', async () => {
    authApi.verifyTwoFactor.mockResolvedValue({ userId: 9, roles: ['Owner'] })
    renderProvider()
    await userEvent.click(await screen.findByText('verify-2fa'))
    expect(await screen.findByText('9:Owner')).toBeInTheDocument()
    expect(authApi.verifyTwoFactor).toHaveBeenCalledWith('c'.repeat(32), '123456')
    expect(JSON.parse(sessionStorage.getItem(USER_STORAGE_KEY))).toEqual({ userId: 9, roles: ['Owner'], email: 'an@example.com' })
  })

  it('verifyTwoFactor_Failure_StaysGuest', async () => {
    authApi.verifyTwoFactor.mockRejectedValue(new Error('bad code'))
    renderProvider()
    await userEvent.click(await screen.findByText('verify-2fa'))
    expect(screen.getByTestId('user')).toHaveTextContent('guest')
  })

  it('resendTwoFactor_Called_ReturnsNewChallenge', async () => {
    authApi.resendTwoFactor.mockResolvedValue({ challengeId: 'd'.repeat(32) })
    renderProvider()
    await userEvent.click(await screen.findByText('resend-2fa'))
    await waitFor(() => expect(window.__resendResult).toEqual({ challengeId: 'd'.repeat(32) }))
  })

  it('login_Failure_StaysGuest', async () => {
    authApi.login.mockRejectedValue(new Error('Invalid credentials'))
    renderProvider()
    await userEvent.click(await screen.findByText('login'))
    expect(screen.getByTestId('user')).toHaveTextContent('guest')
  })

  it('logout_LoggedIn_ClearsUser', async () => {
    authApi.login.mockResolvedValue({ userId: 7, roles: ['Owner'] })
    authApi.logout.mockResolvedValue()
    renderProvider()
    await userEvent.click(await screen.findByText('login'))
    await userEvent.click(screen.getByText('logout'))
    expect(screen.getByTestId('user')).toHaveTextContent('guest')
    expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBeNull()
  })

  it('logout_ApiFails_StillClearsUser', async () => {
    authApi.login.mockResolvedValue({ userId: 7, roles: ['Owner'] })
    authApi.logout.mockRejectedValue(new Error('network'))
    renderProvider()
    await userEvent.click(await screen.findByText('login'))
    await userEvent.click(screen.getByText('logout'))
    expect(screen.getByTestId('user')).toHaveTextContent('guest')
  })

  it('init_StoredUserValidSession_RestoresUser', async () => {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ userId: 3, roles: ['Owner'] }))
    authApi.checkSession.mockResolvedValue({ userId: 3, roles: ['Owner'], email: 'real@example.com', fullName: 'An' })
    renderProvider()
    expect(screen.getByText('checking')).toBeInTheDocument()
    expect(await screen.findByTestId('user')).toHaveTextContent('3:Owner')
  })

  it('init_ValidSession_RefreshesStoredUserWithRolesAndEmailFromServer', async () => {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ userId: 3, roles: ['Owner'], email: 'cu@example.com' }))
    authApi.checkSession.mockResolvedValue({ userId: 3, roles: ['Owner', 'Beneficiary'], email: 'moi@example.com', fullName: 'An' })
    renderProvider()
    expect(await screen.findByTestId('user')).toHaveTextContent('3:Owner,Beneficiary')
    expect(JSON.parse(sessionStorage.getItem(USER_STORAGE_KEY))).toEqual({ userId: 3, roles: ['Owner', 'Beneficiary'], email: 'moi@example.com' })
  })

  it('init_StoredUserExpiredSession_ClearsUser', async () => {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ userId: 3, roles: ['Owner'] }))
    authApi.checkSession.mockResolvedValue(null)
    renderProvider()
    expect(await screen.findByTestId('user')).toHaveTextContent('guest')
    expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBeNull()
  })

  it('init_StoredUserCorrupted_IsGuest', async () => {
    sessionStorage.setItem(USER_STORAGE_KEY, '{not json')
    renderProvider()
    expect(await screen.findByTestId('user')).toHaveTextContent('guest')
  })

  it('unauthorizedHandler_Triggered_ClearsUser', async () => {
    authApi.login.mockResolvedValue({ userId: 7, roles: ['Owner'] })
    renderProvider()
    await userEvent.click(await screen.findByText('login'))
    const handler = setUnauthorizedHandler.mock.calls.at(-1)[0]
    act(() => handler())
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('guest'))
  })
})
