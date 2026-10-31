import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { googleStartUrl } from '../../callapi/googleAuthApi'
import { redirectTo } from '../../utils/navigation'
import GoogleLoginButton from './GoogleLoginButton'

vi.mock('../../utils/navigation', () => ({ redirectTo: vi.fn() }))

describe('GoogleLoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('render_Default_ShowsGoogleButtonMentioningBothLoginAndRegister', () => {
    render(<GoogleLoginButton />)
    expect(screen.getByRole('button', { name: 'Đăng nhập hoặc đăng ký bằng Google' })).toBeEnabled()
  })

  it('click_Button_SendsWholeBrowserToBackendGoogleStart', async () => {
    render(<GoogleLoginButton />)
    await userEvent.click(screen.getByRole('button', { name: /Google/ }))
    expect(redirectTo).toHaveBeenCalledTimes(1)
    expect(redirectTo).toHaveBeenCalledWith(googleStartUrl())
  })

  it('click_AfterRedirectStarted_DisablesButtonSoItCannotBePressedTwice', async () => {
    render(<GoogleLoginButton />)
    await userEvent.click(screen.getByRole('button', { name: /Google/ }))
    expect(screen.getByRole('button', { name: /Đang chuyển tới Google/ })).toBeDisabled()
  })

  it('render_DisabledProp_DisablesButton', () => {
    render(<GoogleLoginButton disabled />)
    expect(screen.getByRole('button', { name: /Google/ })).toBeDisabled()
  })
})
