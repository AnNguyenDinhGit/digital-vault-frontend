import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import LandingPage from './LandingPage'

vi.mock('../callapi/authApi', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  checkSession: vi.fn(),
  register: vi.fn(),
}))

describe('LandingPage', () => {
  it('render_Default_ShowsHeaderHeroAndLoginCard', () => {
    renderWithProviders(<LandingPage />)
    expect(screen.getByRole('navigation')).toHaveTextContent('Chuẩn bảo mật E2EE')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bảo Vệ & Chuyển Giao')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Di Sản Kỹ Thuật Số')
    expect(screen.getByText('ZERO-KNOWLEDGE ENCRYPTION & LEGAL BINDING')).toBeInTheDocument()
    expect(screen.getByText("Cơ chế điểm danh sự sống (Dead Man's Switch)")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Đăng Nhập Cổng An Toàn' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('AES-256-GCM')
  })

  it('accessButton_Rendered_LinksToLoginCard', () => {
    renderWithProviders(<LandingPage />)
    expect(screen.getByRole('link', { name: /Cổng Truy Cập/ })).toHaveAttribute('href', '#login')
  })
})

describe('LandingPage register flow', () => {
  it('registerLink_Clicked_OpensRegisterModal', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    renderWithProviders(<LandingPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký tạo Vault mới' }))
    expect(screen.getByRole('dialog', { name: 'Đăng Ký Tạo Kho Di Sản Số Mới' })).toBeInTheDocument()
  })

  it('register_Success_ClosesModalAndPrefillsLoginEmail', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const authApi = await import('../callapi/authApi')
    authApi.register.mockResolvedValue({ userId: 1 })
    renderWithProviders(<LandingPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký tạo Vault mới' }))
    await userEvent.type(screen.getByLabelText(/^Họ và tên chủ sở hữu/), 'Nguyễn Văn An')
    await userEvent.type(screen.getByLabelText(/^Email chính thức/), 'an.nguyen@example.com')
    await userEvent.type(screen.getByLabelText(/^Số điện thoại/), '0901234567')
    await userEvent.type(screen.getByLabelText(/^Mật khẩu tài khoản/), 'Secure#Pass2026')
    await userEvent.type(screen.getByLabelText(/^Xác nhận mật khẩu/), 'Secure#Pass2026')
    await userEvent.click(screen.getByRole('checkbox', { name: /Tôi đồng ý/ }))
    await userEvent.click(screen.getByRole('button', { name: /Tạo Kho Di Sản Ngay/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Email$|^Email \*/)).toHaveValue('an.nguyen@example.com')
    expect(screen.getByRole('status')).toHaveTextContent('Đăng ký thành công')
  })
})
