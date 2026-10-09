import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import ProtectedRoute from './ProtectedRoute'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))

const mockAuth = (value) =>
  useAuth.mockReturnValue({
    user: null,
    isChecking: false,
    logout: vi.fn(),
    hasRole: (role) => Boolean(value.user?.roles?.includes(role)),
    ...value,
  })

const renderRoute = () =>
  render(
    <MemoryRouter initialEntries={['/owner/assets']}>
      <Routes>
        <Route path="/" element={<p>landing-page</p>} />
        <Route element={<ProtectedRoute role="Owner" />}>
          <Route path="/owner/assets" element={<p>owner-content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('ProtectedRoute', () => {
  it('render_CheckingSession_ShowsLoadingStatus', () => {
    mockAuth({ isChecking: true })
    renderRoute()
    expect(screen.getByRole('status')).toHaveTextContent('Đang kiểm tra phiên đăng nhập')
    expect(screen.queryByText('owner-content')).not.toBeInTheDocument()
  })

  it('render_Guest_RedirectsToLanding', () => {
    mockAuth({ user: null })
    renderRoute()
    expect(screen.getByText('landing-page')).toBeInTheDocument()
  })

  it('render_UserWithoutRole_ShowsForbiddenMessage', () => {
    mockAuth({ user: { userId: 2, roles: ['Executor'] } })
    renderRoute()
    expect(screen.getByRole('heading', { name: 'Bạn không có quyền truy cập khu vực này' })).toBeInTheDocument()
    expect(screen.queryByText('owner-content')).not.toBeInTheDocument()
  })

  it('render_UserWithRole_RendersChildRoute', () => {
    mockAuth({ user: { userId: 1, roles: ['Owner'] } })
    renderRoute()
    expect(screen.getByText('owner-content')).toBeInTheDocument()
  })
})
