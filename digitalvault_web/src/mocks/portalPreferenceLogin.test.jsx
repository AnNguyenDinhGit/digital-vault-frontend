import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import LoginForm from '../components/auth/LoginForm'
import { useAuth } from '../hooks/useAuth'
import { USER_STORAGE_KEY } from '../contexts/authContextInstance'
import { renderWithProviders } from '../test/renderWithProviders'
import { getPortalPreference, PORTAL_STORAGE_KEY, setPortalPreference } from '../utils/portalPreference'
import { resetMockDb } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetMockDb()
  sessionStorage.removeItem(USER_STORAGE_KEY)
  sessionStorage.removeItem(PORTAL_STORAGE_KEY)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const PORTALS = [
  { path: '/beneficiary', element: <p>beneficiary-portal</p> },
  { path: '/owner/assets', element: <p>owner-portal</p> },
]

// Trần Bảo Long vừa là chủ sở hữu vừa là người thụ hưởng
const MULTI_ROLE = { email: 'long.tran@example.com', password: 'Owner@123456' }

async function submitLogin() {
  renderWithProviders(<LoginForm onOpenRegister={vi.fn()} />, { extraRoutes: PORTALS })
  await userEvent.type(screen.getByLabelText(/^Email/), MULTI_ROLE.email)
  await userEvent.type(screen.getByLabelText(/^Mật khẩu xác thực/), MULTI_ROLE.password)
  await userEvent.click(screen.getByRole('button', { name: /Đăng Nhập Ngay/ }))
}

describe('login goes to the remembered portal', () => {
  it('loginForm_MultiRoleWithoutPreference_GoesToOwnerPortal', async () => {
    await submitLogin()
    expect(await screen.findByText('owner-portal')).toBeInTheDocument()
  })

  it('loginForm_MultiRoleWithBeneficiaryPreference_GoesToBeneficiaryPortal', async () => {
    setPortalPreference('Beneficiary')
    await submitLogin()
    expect(await screen.findByText('beneficiary-portal')).toBeInTheDocument()
  })
})

describe('logout forgets the remembered portal', () => {
  it('logout_Click_ClearsPortalPreference', async () => {
    function LogoutButton() {
      const { logout } = useAuth()
      return <button type="button" onClick={logout}>logout</button>
    }
    setPortalPreference('Beneficiary')
    renderWithProviders(<LogoutButton />)
    await userEvent.click(screen.getByRole('button', { name: 'logout' }))
    await vi.waitFor(() => expect(getPortalPreference()).toBeNull())
  })
})
