import { render, screen, within } from '@testing-library/react'
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

  it('render_ProofOfLifeLink_IsEnabled', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /Điểm danh sự sống/ })).toHaveAttribute('href', '/owner/proof-of-life')
  })

  it('render_ExecutorLink_IsEnabled', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /Người thi hành/ })).toHaveAttribute('href', '/owner/executor')
  })

  it('render_ActivityLogLink_IsEnabled', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /Nhật ký hoạt động/ })).toHaveAttribute('href', '/owner/activity-log')
  })

  it('render_SecuritySettingsLink_IsEnabled', () => {
    renderLayout()
    expect(screen.getByRole('link', { name: /Cài đặt bảo mật/ })).toHaveAttribute('href', '/owner/security')
  })

  it('render_AllSidebarItems_AreLinks', () => {
    renderLayout()
    const nav = screen.getByRole('navigation', { name: 'Điều hướng Vault Owner' })
    expect(within(nav).queryAllByRole('button')).toHaveLength(0)
    expect(within(nav).getAllByRole('link')).toHaveLength(6)
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
