import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import OwnerLayout from './OwnerLayout'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))

const logout = vi.fn()

const renderLayout = () => {
  useAuth.mockReturnValue({
    user: { userId: 1, roles: ['Owner'], email: 'an.nguyen@example.com' },
    logout,
  })
  return render(
    <MemoryRouter initialEntries={['/owner/assets']}>
      <Routes>
        <Route path="/" element={<p>landing-page</p>} />
        <Route path="/owner" element={<OwnerLayout />}>
          <Route path="assets" element={<p>assets-content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('OwnerLayout', () => {
  beforeEach(() => {
    logout.mockReset().mockResolvedValue()
  })

  it('render_Default_ShowsSidebarSectionsAndOutlet', () => {
    renderLayout()
    expect(screen.getByText('VAULT OWNER PORTAL')).toBeInTheDocument()
    expect(screen.getByText('KHO TÀI SẢN SỐ')).toBeInTheDocument()
    expect(screen.getByText('GIÁM SÁT & BẢO MẬT')).toBeInTheDocument()
    expect(screen.getByText('assets-content')).toBeInTheDocument()
  })

  it('render_AssetsRoute_MarksAssetsLinkActive', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /Danh mục tài sản số/ })).toHaveAttribute('aria-current', 'page')
  })

  it('render_BeneficiariesLink_IsEnabled', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /Người thụ hưởng/ })).toHaveAttribute('href', '/owner/beneficiaries')
  })

  it('render_UnsupportedItems_AreDisabledWithComingSoon', () => {
    renderLayout()
    for (const name of [/Người thi hành/, /Điểm danh sự sống/, /Nhật ký hoạt động/, /Cài đặt bảo mật/]) {
      const item = screen.getByRole('button', { name })
      expect(item).toBeDisabled()
      expect(item).toHaveAttribute('title', 'Sắp ra mắt')
    }
  })

  it('render_LoggedInUser_ShowsEmailAndInitials', () => {
    renderLayout()
    expect(screen.getByText('an.nguyen@example.com')).toBeInTheDocument()
    expect(screen.getByText('AN')).toBeInTheDocument()
  })

  it('logout_Clicked_LogsOutAndReturnsToLanding', async () => {
    renderLayout()
    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('landing-page')).toBeInTheDocument()
  })
})
