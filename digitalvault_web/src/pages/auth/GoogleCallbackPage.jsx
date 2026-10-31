import { MailCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { getGoogleChallenge, resendGoogleOtp } from '../../callapi/googleAuthApi'
import TwoFactorModal from '../../components/auth/TwoFactorModal'
import BrandLogo from '../../components/common/BrandLogo'
import TextField from '../../components/common/TextField'
import { useAuth } from '../../hooks/useAuth'
import { googleErrorMessage, isGoogleSessionExpired } from '../../utils/googleAuth'
import { getPortalPreference } from '../../utils/portalPreference'
import { getDefaultRouteForRoles } from '../../utils/roleRoutes'
import { validateOtp } from '../../utils/validators'

function Shell({ children }) {
  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center p-4">
      <section className="av-panel d-flex flex-column gap-4 w-100" style={{ maxWidth: 480 }}>
        <BrandLogo />
        {children}
      </section>
    </main>
  )
}

// Trang BE chuyển trình duyệt về sau khi Google xác thực xong (Google:FrontendCallbackUrl).
// Email đã có tài khoản thì hoàn tất đăng nhập ngay; email mới thì nhập OTP 6 số BE gửi về để BE tạo tài khoản Owner.
export default function GoogleCallbackPage({ resendCooldownSeconds = 60 }) {
  const { completeGoogleLogin, verifyGoogleOtp } = useAuth()
  const navigate = useNavigate()
  // BE chỉ cho dùng mỗi challenge một lần; StrictMode chạy effect hai lần ở bản dev nên phải chặn gọi lặp
  const started = useRef(false)
  const [view, setView] = useState('loading')
  const [error, setError] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [twoFactor, setTwoFactor] = useState(null)
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [alert, setAlert] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(resendCooldownSeconds)

  const fail = useCallback((message) => {
    setError(message)
    setView('error')
  }, [])

  const enterWorkspace = useCallback(
    (user) => {
      const target = getDefaultRouteForRoles(user?.roles, getPortalPreference())
      if (target) navigate(target, { replace: true })
      else fail('Tài khoản của bạn chưa được phân quyền trong hệ thống. Vui lòng liên hệ quản trị viên.')
    },
    [navigate, fail],
  )

  // Kết quả đăng nhập: user thì vào khu làm việc, challenge (requiresTwoFactor) thì mở hộp thoại nhập mã hai lớp
  const handleResult = useCallback((result) => (result.requiresTwoFactor ? setTwoFactor(result) : enterWorkspace(result)), [enterWorkspace])

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      try {
        const state = await getGoogleChallenge()
        setChallengeId(state.challengeId)
        if (state.requiresOtp) {
          setView('otp')
          return
        }
        handleResult(await completeGoogleLogin(state.challengeId))
      } catch (caught) {
        fail(googleErrorMessage(caught))
      }
    })()
  }, [completeGoogleLogin, handleResult, fail])

  // Đếm ngược thời gian chờ gửi lại OTP (BE bắt chờ 60 giây giữa hai lần gửi)
  useEffect(() => {
    if (view !== 'otp' || cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [view, cooldown])

  // Lỗi ở bước OTP: phiên hết hạn thì về màn lỗi, còn lại báo ngay trên form để nhập lại
  const handleOtpError = (caught) => {
    if (isGoogleSessionExpired(caught)) fail(googleErrorMessage(caught))
    else setAlert(googleErrorMessage(caught, 'otp'))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (busy) return
    const validation = validateOtp(code)
    setFieldError(validation.otp ?? '')
    setAlert('')
    setNotice('')
    if (validation.otp) return
    setBusy(true)
    try {
      handleResult(await verifyGoogleOtp(challengeId, code))
    } catch (caught) {
      handleOtpError(caught)
    } finally {
      setBusy(false)
    }
  }

  const handleResend = async () => {
    setAlert('')
    setNotice('')
    setResending(true)
    try {
      const next = await resendGoogleOtp(challengeId)
      setChallengeId(next.challengeId)
      setNotice('Đã gửi lại mã OTP vào email của bạn.')
    } catch (caught) {
      handleOtpError(caught)
    } finally {
      setCooldown(resendCooldownSeconds)
      setResending(false)
    }
  }

  const twoFactorModal = twoFactor && (
    <TwoFactorModal
      challenge={twoFactor}
      email=""
      onClose={() => {
        setTwoFactor(null)
        fail('Bạn chưa hoàn tất xác thực hai lớp nên chưa đăng nhập. Hãy đăng nhập lại.')
      }}
      onVerified={(user) => {
        setTwoFactor(null)
        enterWorkspace(user)
      }}
    />
  )

  if (view === 'error') {
    return (
      <Shell>
        <Alert variant="danger" className="av-alert mb-0">{error}</Alert>
        <Link to="/" className="fs-13">Quay lại đăng nhập</Link>
      </Shell>
    )
  }

  if (view === 'otp') {
    return (
      <Shell>
        <div className="d-flex flex-column align-items-center gap-2 text-center">
          <span className="av-icon-tile">
            <MailCheck size={20} aria-hidden="true" />
          </span>
          <h1 className="mb-0 fw-bold text-ink" style={{ fontSize: 22 }}>
            Xác thực email Google
          </h1>
          <p className="mb-0 fs-13 text-slate-500">Mã OTP 6 chữ số đã được gửi tới email Google của bạn. Nhập mã để hoàn tất tạo tài khoản. Mã có hiệu lực 5 phút.</p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
          <TextField
            id="google-otp"
            name="code"
            inputMode="numeric"
            maxLength={6}
            label="Mã OTP"
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setFieldError('')
            }}
            error={fieldError}
          />
          {notice && (
            <p role="status" className="mb-0 fs-12 text-brand">
              {notice}
            </p>
          )}
          {alert && <Alert variant="danger" className="av-alert mb-0">{alert}</Alert>}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <button type="button" className="av-link-btn fs-12" disabled={cooldown > 0 || resending || busy} onClick={handleResend}>
              {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã OTP'}
            </button>
            <Button type="submit" variant="primary" className="av-btn av-btn-md" disabled={busy}>
              {busy ? 'Đang xác nhận...' : 'Xác nhận'}
            </Button>
          </div>
        </form>
        {twoFactorModal}
      </Shell>
    )
  }

  return (
    <Shell>
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500 mb-0">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang xử lý đăng nhập Google...
      </p>
      {twoFactorModal}
    </Shell>
  )
}
