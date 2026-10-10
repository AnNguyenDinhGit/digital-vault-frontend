import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import LoginForm from '../components/auth/LoginForm'
import ProtectedRoute from '../components/routing/ProtectedRoute'
import { getDefaultRouteForRoles } from '../utils/roleRoutes'
import { renderWithProviders } from '../test/renderWithProviders'
import { login } from '../callapi/authApi'
import { USER_STORAGE_KEY } from '../contexts/authContextInstance'
import { resetMockDb, ROLE_ACCOUNTS } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetMockDb()
  sessionStorage.removeItem(USER_STORAGE_KEY)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Trang đích của từng khu vực, dùng để kiểm tra điều hướng sau đăng nhập
const PORTALS = [
  { path: '/admin', element: <p>admin-portal</p> },
  { path: '/verifier', element: <p>verifier-portal</p> },
  { path: '/executor', element: <p>executor-portal</p> },
  { path: '/beneficiary', element: <p>beneficiary-portal</p> },
  { path: '/owner/assets', element: <p>owner-portal</p> },
]

const EXPECTED_PORTAL = {
  Admin: 'admin-portal',
  LegalVerifier: 'verifier-portal',
  Executor: 'executor-portal',
  Beneficiary: 'beneficiary-portal',
}

describe('role accounts login routing', () => {
  it.each(ROLE_ACCOUNTS)('loginForm_$role_NavigatesToRolePortal', async ({ role, email, password }) => {
    renderWithProviders(<LoginForm onOpenRegister={vi.fn()} />, { extraRoutes: PORTALS })
    await userEvent.type(screen.getByLabelText(/^Email/), email)
    await userEvent.type(screen.getByLabelText(/^Mật khẩu xác thực/), password)
    await userEvent.click(screen.getByRole('button', { name: /Đăng Nhập Ngay/ }))
    expect(await screen.findByText(EXPECTED_PORTAL[role])).toBeInTheDocument()
  })

  it.each(ROLE_ACCOUNTS)('getDefaultRoute_$role_MatchesLoginRoles', async ({ role, email, password }) => {
    const { roles } = await login(email, password)
    expect(roles).toEqual([role])
    expect(getDefaultRouteForRoles(roles)).not.toBe('/owner/assets')
  })
})

describe('role accounts access control', () => {
  async function renderAs(account, requiredRole) {
    const { userId, roles } = await login(account.email, account.password)
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ userId, roles, email: account.email }))
    renderWithProviders(<ProtectedRoute role={requiredRole} />)
  }

  it.each(ROLE_ACCOUNTS)('protectedRoute_$role_DeniedOnOwnerArea', async (account) => {
    await renderAs(account, 'Owner')
    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập khu vực này' })).toBeInTheDocument()
  })

  it.each(ROLE_ACCOUNTS)('protectedRoute_$role_AllowedOnOwnRoleArea', async (account) => {
    await renderAs(account, account.role)
    // Đợi bước kiểm tra phiên kết thúc rồi mới khẳng định không bị chặn
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Bạn không có quyền truy cập khu vực này' })).not.toBeInTheDocument()
  })
})
