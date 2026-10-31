import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { StrictMode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import { USER_STORAGE_KEY } from '../../contexts/authContextInstance'
import GoogleCallbackPage from './GoogleCallbackPage'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  sessionStorage.clear()
  localStorage.clear()
})
afterAll(() => server.close())

const CHALLENGE_ID = 'c'.repeat(32)
const TOKENS = { userId: 7, roles: ['Owner'], accessToken: 'access-1', refreshToken: 'refresh-1', refreshTokenExpiresAt: '2026-12-01T00:00:00Z' }
const json = (status, detail) => HttpResponse.json({ status, detail }, { status })

// Mỗi handler đếm số lần BE bị gọi
const calls = { challenge: 0, complete: 0, verify: 0, resend: 0 }
beforeEach(() => {
  Object.keys(calls).forEach((key) => {
    calls[key] = 0
  })
  server.use(http.get('*/api/auth/me', () => HttpResponse.json({ userId: 7, fullName: 'An', email: 'an@gmail.com', roles: ['Owner'] })))
})

const challenge = (body) =>
  server.use(
    http.get('*/api/auth/google/challenge', () => {
      calls.challenge += 1
      return HttpResponse.json({ challengeId: CHALLENGE_ID, expiresAt: '2026-10-31T10:00:00Z', ...body })
    }),
  )

const completeOk = (response = HttpResponse.json(TOKENS)) =>
  server.use(
    http.post('*/api/auth/google/complete', () => {
      calls.complete += 1
      return response
    }),
  )

const verifyWith = (respond) =>
  server.use(
    http.post('*/api/auth/google/otp/verify', async ({ request }) => {
      calls.verify += 1
      calls.lastVerifyBody = await request.json()
      return respond()
    }),
  )

const renderPage = (props = {}, { strict = false } = {}) => {
  const tree = (
    <AuthProvider>
      <MemoryRouter initialEntries={['/auth/google/callback']}>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleCallbackPage resendCooldownSeconds={0} {...props} />} />
          <Route path="/owner/assets" element={<p>owner-assets-page</p>} />
          <Route path="/beneficiary" element={<p>beneficiary-portal-page</p>} />
          <Route path="/" element={<p>landing-page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

describe('GoogleCallbackPage existing account', () => {
  it('render_WhileProcessing_ShowsLoadingStatus', async () => {
    challenge({ requiresOtp: false })
    completeOk()
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang xử lý đăng nhập Google')
    expect(await screen.findByText('owner-assets-page')).toBeInTheDocument()
  })

  it('login_NoOtpNeeded_CompletesAndEntersOwnerWorkspace', async () => {
    challenge({ requiresOtp: false })
    completeOk()
    renderPage()
    expect(await screen.findByText('owner-assets-page')).toBeInTheDocument()
    expect(calls.complete).toBe(1)
    // BE không trả email khi đăng nhập Google nên FE lấy qua /auth/me để hiển thị
    expect(JSON.parse(sessionStorage.getItem(USER_STORAGE_KEY))).toEqual({ userId: 7, roles: ['Owner'], email: 'an@gmail.com' })
  })

  it('login_BeneficiaryAccount_GoesToBeneficiaryPortal', async () => {
    challenge({ requiresOtp: false })
    completeOk(HttpResponse.json({ ...TOKENS, roles: ['Beneficiary'] }))
    renderPage()
    expect(await screen.findByText('beneficiary-portal-page')).toBeInTheDocument()
  })

  it('login_AccountWithoutAnyRole_ShowsNotAuthorizedMessage', async () => {
    challenge({ requiresOtp: false })
    completeOk(HttpResponse.json({ ...TOKENS, roles: [] }))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa được phân quyền')
  })

  it('login_RoleNotAllowedForGoogle_ShowsExplanationWithLinkBackToLogin', async () => {
    challenge({ requiresOtp: false })
    server.use(http.post('*/api/auth/google/complete', () => json(403, 'This account cannot use public Google sign-in.')))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Chủ sở hữu')
    await userEvent.click(screen.getByRole('link', { name: 'Quay lại đăng nhập' }))
    expect(await screen.findByText('landing-page')).toBeInTheDocument()
  })

  it('login_TwoFactorRequired_OpensCodeDialogAndFinishesAfterVerify', async () => {
    challenge({ requiresOtp: false })
    completeOk(HttpResponse.json({ requiresTwoFactor: true, challengeId: 'f'.repeat(32), method: 'Email', expiresAt: '2026-10-31T10:05:00Z' }, { status: 202 }))
    server.use(http.post('*/api/auth/2fa/verify', () => HttpResponse.json(TOKENS)))
    renderPage()
    const dialog = await screen.findByRole('dialog', { name: 'Xác Thực Hai Lớp' })
    await userEvent.type(within(dialog).getByLabelText(/^Mã xác thực/), '123456')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
    expect(await screen.findByText('owner-assets-page')).toBeInTheDocument()
  })

  it('login_TwoFactorDialogCancelled_ShowsErrorWithLinkBack', async () => {
    challenge({ requiresOtp: false })
    completeOk(HttpResponse.json({ requiresTwoFactor: true, challengeId: 'f'.repeat(32), method: 'Email', expiresAt: 'x' }, { status: 202 }))
    renderPage()
    const dialog = await screen.findByRole('dialog', { name: 'Xác Thực Hai Lớp' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(await screen.findByRole('link', { name: 'Quay lại đăng nhập' })).toBeInTheDocument()
  })

  it('login_StrictModeDoubleEffect_CallsBackendOnlyOnce', async () => {
    challenge({ requiresOtp: false })
    completeOk()
    renderPage({}, { strict: true })
    expect(await screen.findByText('owner-assets-page')).toBeInTheDocument()
    expect(calls.challenge).toBe(1)
    expect(calls.complete).toBe(1)
  })
})

describe('GoogleCallbackPage session errors', () => {
  it('challenge_SessionExpiredOrOtherBrowser_ShowsErrorAndLinkBack', async () => {
    server.use(http.get('*/api/auth/google/challenge', () => json(400, 'Google sign-in expired or belongs to another browser. Start again.')))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('cùng trình duyệt')
    expect(screen.getByRole('link', { name: 'Quay lại đăng nhập' })).toBeInTheDocument()
  })

  it('challenge_BackendUnreachable_ShowsConnectionMessage', async () => {
    server.use(http.get('*/api/auth/google/challenge', () => HttpResponse.error()))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối tới máy chủ')
  })

  it('complete_GoogleAccountChanged409_AsksToStartOver', async () => {
    challenge({ requiresOtp: false })
    server.use(http.post('*/api/auth/google/complete', () => json(409, 'Google account changed. Start sign-in again.')))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('đăng nhập lại từ đầu')
  })
})

describe('GoogleCallbackPage new account OTP', () => {
  const openOtpForm = async (props) => {
    challenge({ requiresOtp: true })
    renderPage(props)
    return screen.findByRole('heading', { name: 'Xác thực email Google' })
  }

  it('render_NewEmail_ShowsOtpFormAndDoesNotCallComplete', async () => {
    await openOtpForm()
    expect(screen.getByLabelText(/^Mã OTP/)).toBeInTheDocument()
    expect(screen.getByText(/đã được gửi tới email/)).toBeInTheDocument()
    expect(calls.complete).toBe(0)
  })

  it('verify_CorrectCode_CreatesSessionAndEntersWorkspace', async () => {
    verifyWith(() => HttpResponse.json(TOKENS))
    await openOtpForm()
    await userEvent.type(screen.getByLabelText(/^Mã OTP/), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(await screen.findByText('owner-assets-page')).toBeInTheDocument()
    expect(calls.lastVerifyBody).toEqual({ challengeId: CHALLENGE_ID, code: '123456' })
  })

  it('verify_EmptyOrShortCode_ShowsFieldErrorWithoutCallingBackend', async () => {
    verifyWith(() => HttpResponse.json(TOKENS))
    await openOtpForm()
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(await screen.findByText('Vui lòng nhập mã xác nhận.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/^Mã OTP/), '12')
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(await screen.findByText('Mã gồm đúng 6 chữ số.')).toBeInTheDocument()
    expect(calls.verify).toBe(0)
  })

  it('verify_WrongCode_ShowsErrorAndKeepsFormForAnotherTry', async () => {
    verifyWith(() => json(400, 'Invalid or expired OTP.'))
    await openOtpForm()
    await userEvent.type(screen.getByLabelText(/^Mã OTP/), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã OTP không đúng hoặc đã hết hạn.')
    expect(screen.getByLabelText(/^Mã OTP/)).toBeInTheDocument()
  })

  it('verify_SessionExpiredWhileTyping_SwitchesToErrorScreen', async () => {
    verifyWith(() => json(400, 'Google sign-in expired or belongs to another browser. Start again.'))
    await openOtpForm()
    await userEvent.type(screen.getByLabelText(/^Mã OTP/), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(await screen.findByRole('link', { name: 'Quay lại đăng nhập' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Mã OTP/)).not.toBeInTheDocument()
  })

  it('verify_TooManyAttempts429_ShowsWaitMessage', async () => {
    verifyWith(() => json(429, 'Too many requests'))
    await openOtpForm()
    await userEvent.type(screen.getByLabelText(/^Mã OTP/), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('1 phút')
  })

  it('verify_TwoFactorRequired_OpensCodeDialog', async () => {
    verifyWith(() => HttpResponse.json({ requiresTwoFactor: true, challengeId: 'f'.repeat(32), method: 'Email', expiresAt: 'x' }, { status: 202 }))
    await openOtpForm()
    await userEvent.type(screen.getByLabelText(/^Mã OTP/), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(await screen.findByRole('dialog', { name: 'Xác Thực Hai Lớp' })).toBeInTheDocument()
  })

  it('resend_Click_UsesNewChallengeIdForNextVerifyAndShowsNotice', async () => {
    server.use(
      http.post('*/api/auth/google/otp/resend', () => {
        calls.resend += 1
        return HttpResponse.json({ challengeId: 'n'.repeat(32), expiresAt: '2026-10-31T10:10:00Z' })
      }),
    )
    verifyWith(() => HttpResponse.json(TOKENS))
    await openOtpForm()
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lại mã OTP' }))
    expect(await screen.findByText('Đã gửi lại mã OTP vào email của bạn.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/^Mã OTP/), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    await screen.findByText('owner-assets-page')
    expect(calls.resend).toBe(1)
    expect(calls.lastVerifyBody.challengeId).toBe('n'.repeat(32))
  })

  it('resend_TooSoon429_ShowsWaitMessageAndKeepsOldChallenge', async () => {
    server.use(http.post('*/api/auth/google/otp/resend', () => json(429, 'Wait 60 seconds before requesting another OTP.')))
    await openOtpForm()
    await userEvent.click(screen.getByRole('button', { name: 'Gửi lại mã OTP' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('1 phút')
    expect(screen.getByLabelText(/^Mã OTP/)).toBeInTheDocument()
  })

  it('resend_DefaultCooldown_DisablesButtonWithCountdownUntilItExpires', async () => {
    await openOtpForm({ resendCooldownSeconds: 60 })
    const button = screen.getByRole('button', { name: /Gửi lại sau \d+s/ })
    expect(button).toBeDisabled()
  })

  it('verify_Pending_DisablesSubmitWhileWaiting', async () => {
    verifyWith(() => new Promise(() => {}))
    await openOtpForm()
    await userEvent.type(screen.getByLabelText(/^Mã OTP/), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đang xác nhận...' })).toBeDisabled())
  })
})
