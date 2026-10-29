import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { DEMO_ACCOUNT, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import TwoFactorModal from './TwoFactorModal'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetMockDb()
  sessionStorage.clear()
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

async function startChallenge() {
  getDb().security[DEMO_ACCOUNT.userId] = { ...getDb().security[DEMO_ACCOUNT.userId], twoFactorEnabled: true }
  return login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
}

async function renderModal(props = {}) {
  const challenge = props.challenge ?? (await startChallenge())
  const callbacks = { onVerified: vi.fn(), onClose: vi.fn() }
  renderWithProviders(<TwoFactorModal email={DEMO_ACCOUNT.email} mockMode="full" {...callbacks} {...props} challenge={challenge} />)
  return { challenge, ...callbacks }
}

const dialog = () => screen.getByRole('dialog', { name: 'Xác Thực Hai Lớp' })
const codeField = () => within(dialog()).getByLabelText(/^Mã xác thực/)
const submit = () => userEvent.click(within(dialog()).getByRole('button', { name: 'Xác nhận' }))

describe('TwoFactorModal', () => {
  it('render_EmailMethod_ExplainsAndOffersResend', async () => {
    await renderModal()
    expect(dialog()).toHaveTextContent('email')
    expect(within(dialog()).getByRole('button', { name: 'Gửi lại mã' })).toBeInTheDocument()
  })

  it('render_TotpMethod_HidesResend', async () => {
    await renderModal({ challenge: { requiresTwoFactor: true, challengeId: 'a'.repeat(32), method: 'TOTP', expiresAt: 'x' } })
    expect(dialog()).toHaveTextContent('ứng dụng xác thực')
    expect(within(dialog()).queryByRole('button', { name: 'Gửi lại mã' })).not.toBeInTheDocument()
  })

  it('render_MockModeWithMockCode_ShowsDemoCodeHint', async () => {
    const { challenge } = await renderModal()
    expect(within(dialog()).getByRole('note')).toHaveTextContent(`Mã xác thực mô phỏng: ${challenge.mockCode}`)
  })

  it('render_MockModeOff_NeverShowsCodeEvenIfPresent', async () => {
    await renderModal({ mockMode: 'off' })
    expect(within(dialog()).queryByRole('note')).not.toBeInTheDocument()
  })

  it('submit_Empty_ShowsRequiredError', async () => {
    await renderModal()
    await submit()
    expect(await within(dialog()).findByText('Vui lòng nhập mã xác nhận.')).toBeInTheDocument()
  })

  it('submit_NotSixDigits_ShowsFormatError', async () => {
    await renderModal()
    await userEvent.type(codeField(), '12ab')
    await submit()
    expect(await within(dialog()).findByText('Mã gồm đúng 6 chữ số.')).toBeInTheDocument()
  })

  it('submit_WrongCode_ShowsFieldError', async () => {
    const { challenge, onVerified } = await renderModal()
    await userEvent.type(codeField(), challenge.mockCode === '000000' ? '111111' : '000000')
    await submit()
    expect(await within(dialog()).findByText('Mã xác thực không đúng hoặc đã hết hạn.')).toBeInTheDocument()
    expect(onVerified).not.toHaveBeenCalled()
  })

  it('submit_CorrectCode_CallsOnVerifiedWithUser', async () => {
    const { challenge, onVerified } = await renderModal()
    await userEvent.type(codeField(), challenge.mockCode)
    await submit()
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1))
    expect(onVerified.mock.calls[0][0]).toMatchObject({ userId: 1, roles: ['Owner'], email: DEMO_ACCOUNT.email })
  })

  it('submit_AccountChanged409_AsksToLoginAgain', async () => {
    server.use(http.post('*/api/auth/2fa/verify', () => HttpResponse.json({ status: 409, detail: 'x' }, { status: 409 })))
    await renderModal()
    await userEvent.type(codeField(), '123456')
    await submit()
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Tài khoản đã thay đổi. Vui lòng đăng nhập lại.')
  })

  it('submit_TooManyRequests_ShowsWaitMessage', async () => {
    server.use(http.post('*/api/auth/2fa/verify', () => HttpResponse.json({ status: 429, detail: 'x' }, { status: 429 })))
    await renderModal()
    await userEvent.type(codeField(), '123456')
    await submit()
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Bạn đã thử quá nhiều lần. Vui lòng đợi 1 phút rồi thử lại.')
  })

  it('resend_Cooldown429_ShowsWaitMessage', async () => {
    await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Gửi lại mã' }))
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Vui lòng đợi 1 phút')
  })

  it('resend_AfterCooldown_ReplacesChallengeSoNewCodeWorks', async () => {
    const { challenge, onVerified } = await renderModal()
    getDb().twoFactorChallenges[challenge.challengeId].lastSentAt = Date.now() - 61_000
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Gửi lại mã' }))
    await waitFor(() => expect(within(dialog()).getByRole('note')).not.toHaveTextContent(challenge.mockCode))
    const fresh = within(dialog()).getByRole('note').textContent.match(/\d{6}/)[0]
    await userEvent.type(codeField(), fresh)
    await submit()
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1))
  })

  it('resend_SmtpDown503_ShowsEmailError', async () => {
    server.use(http.post('*/api/auth/2fa/resend', () => HttpResponse.json({ status: 503, detail: 'x' }, { status: 503 })))
    await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Gửi lại mã' }))
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Không gửi được email xác thực. Vui lòng thử lại sau.')
  })

  it('cancel_Clicked_CallsOnClose', async () => {
    const { onClose } = await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Hủy' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
