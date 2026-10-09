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
}))
vi.mock('../callapi/axiosClient', () => ({
  setUnauthorizedHandler: vi.fn(),
}))

// Component thử để đọc giá trị từ context
function Probe() {
  const { user, isChecking, login, logout, hasRole } = useAuth()
  if (isChecking) return <p>checking</p>
  return (
    <div>
      <p data-testid="user">{user ? `${user.userId}:${user.roles.join(',')}` : 'guest'}</p>
      <p data-testid="owner">{hasRole('Owner') ? 'owner' : 'not-owner'}</p>
      <button onClick={() => login('an@example.com', 'Password123456').catch(() => {})}>login</button>
      <button onClick={() => logout()}>logout</button>
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
    authApi.checkSession.mockResolvedValue(true)
    renderProvider()
    expect(screen.getByText('checking')).toBeInTheDocument()
    expect(await screen.findByTestId('user')).toHaveTextContent('3:Owner')
  })

  it('init_StoredUserExpiredSession_ClearsUser', async () => {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ userId: 3, roles: ['Owner'] }))
    authApi.checkSession.mockResolvedValue(false)
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
