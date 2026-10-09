import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as authApi from '../../callapi/authApi'
import { ApiError } from '../../callapi/axiosClient'
import { renderWithProviders } from '../../test/renderWithProviders'
import LoginForm from './LoginForm'

vi.mock('../../callapi/authApi', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  checkSession: vi.fn(),
}))

const renderForm = () =>
  renderWithProviders(<LoginForm onOpenRegister={vi.fn()} />, {
    extraRoutes: [{ path: '/owner/assets', element: <p>owner-assets-page</p> }],
  })

const fillAndSubmit = async (email = 'an.nguyen@aeternavault.io', password = 'Password123456') => {
  if (email) await userEvent.type(screen.getByLabelText(/^Email/), email)
  if (password) await userEvent.type(screen.getByLabelText(/^Mật khẩu xác thực/), password)
  await userEvent.click(screen.getByRole('button', { name: /Đăng Nhập Ngay/ }))
}

describe('LoginForm', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('render_Default_ShowsDesignTexts', () => {
    renderForm()
    expect(screen.getByRole('heading', { name: 'Đăng Nhập Cổng An Toàn' })).toBeInTheDocument()
    expect(screen.getByText('ROLE-BASED AUTOMATIC REDIRECT')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đăng ký tạo Vault mới' })).toBeInTheDocument()
  })

  it('submit_EmptyFields_ShowsValidationAndDoesNotCallApi', async () => {
    renderForm()
    await fillAndSubmit('', '')
    expect(screen.getByText('Vui lòng nhập email.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument()
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('submit_InvalidEmail_ShowsEmailError', async () => {
    renderForm()
    await fillAndSubmit('abc', 'Password123456')
    expect(screen.getByText('Email không hợp lệ.')).toBeInTheDocument()
  })

  it('submit_OwnerCredentials_NavigatesToOwnerAssets', async () => {
    authApi.login.mockResolvedValue({ userId: 7, roles: ['Owner'] })
    renderForm()
    await fillAndSubmit()
    expect(authApi.login).toHaveBeenCalledWith('an.nguyen@aeternavault.io', 'Password123456')
    expect(await screen.findByText('owner-assets-page')).toBeInTheDocument()
  })

  it('submit_NonOwnerRole_ShowsUnsupportedRoleMessage', async () => {
    authApi.login.mockResolvedValue({ userId: 9, roles: ['Executor'] })
    renderForm()
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa hỗ trợ vai trò của bạn')
  })

  it('submit_InvalidCredentials_ShowsFriendlyError', async () => {
    authApi.login.mockRejectedValue(new ApiError(401, 'Invalid credentials or account unavailable.'))
    renderForm()
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không đúng')
  })

  it('submit_TooManyRequests_ShowsRateLimitError', async () => {
    authApi.login.mockRejectedValue(new ApiError(429, ''))
    renderForm()
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('quá nhiều lần')
  })

  it('submit_ServerUnreachable_ShowsConnectionError', async () => {
    authApi.login.mockRejectedValue(new ApiError(0, 'Không thể kết nối tới máy chủ.'))
    renderForm()
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối tới máy chủ.')
  })

  it('submit_Pending_DisablesButton', async () => {
    authApi.login.mockReturnValue(new Promise(() => {}))
    renderForm()
    await fillAndSubmit()
    expect(screen.getByRole('button', { name: /Đang đăng nhập/ })).toBeDisabled()
  })

  it('togglePassword_Clicked_ShowsPlainText', async () => {
    renderForm()
    const input = screen.getByLabelText(/^Mật khẩu xác thực/)
    expect(input).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(input).toHaveAttribute('type', 'text')
  })

  it('unsupportedFeatures_Rendered_AreDisabled', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /Quên mật khẩu/ })).toBeDisabled()
    expect(screen.getByLabelText(/Ghi nhớ phiên đăng nhập này/)).toBeDisabled()
  })

  it('registerLink_Clicked_CallsOnOpenRegister', async () => {
    const onOpenRegister = vi.fn()
    renderWithProviders(<LoginForm onOpenRegister={onOpenRegister} />)
    await userEvent.click(screen.getByRole('button', { name: 'Đăng ký tạo Vault mới' }))
    expect(onOpenRegister).toHaveBeenCalledTimes(1)
  })
})
