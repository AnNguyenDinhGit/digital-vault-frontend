import { ArrowRight, Check, Eye, EyeOff, Info, Lock, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { validateLogin } from '../../utils/validators'
import { getDefaultRouteForRoles } from '../../utils/roleRoutes'
import TextField from '../common/TextField'

const COMING_SOON = 'Sắp ra mắt'

// Chuyển lỗi API sang thông báo thân thiện cho người dùng
function loginErrorMessage(error) {
  if (error?.status === 401) return 'Email hoặc mật khẩu không đúng, hoặc tài khoản đang bị khoá tạm thời.'
  if (error?.status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng đợi 1 phút rồi thử lại.'
  if (error?.status === 400) return 'Thông tin đăng nhập không hợp lệ.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

export default function LoginForm({ onOpenRegister, initialEmail = '', notice = '' }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: initialEmail, password: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateLogin(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const user = await login(form.email.trim(), form.password)
      const targetRoute = getDefaultRouteForRoles(user?.roles)
      if (targetRoute) {
        navigate(targetRoute, { replace: true })
      } else {
        setSubmitError('Tài khoản của bạn chưa được phân quyền trong hệ thống. Vui lòng liên hệ quản trị viên.')
      }
    } catch (error) {
      setSubmitError(loginErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="login" className="av-login-card">
      <div className="d-flex flex-column align-items-center text-center">
        <span className="av-icon-tile">
          <UserRound size={20} aria-hidden="true" />
        </span>
        <h2 className="mt-3 mb-0 fw-bold text-ink" style={{ fontSize: 22, letterSpacing: '-0.025em' }}>
          Đăng Nhập Cổng An Toàn
        </h2>
        <p className="mt-2 mb-0 fs-13 text-slate-500" style={{ maxWidth: 360, lineHeight: 1.6 }}>
          Hệ thống tự động xác định vai trò và điều hướng đến không gian làm việc của bạn
        </p>
      </div>

      {notice && (
        <p role="status" className="av-notice mt-4">
          {notice}
        </p>
      )}

      <form className="mt-4 d-flex flex-column gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="login-email"
          name="email"
          type="email"
          label="Email"
          required
          icon={Mail}
          autoComplete="email"
          placeholder="an.nguyen@aeternavault.io"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
        />

        <TextField
          id="login-password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          label="Mật khẩu xác thực"
          required
          icon={Lock}
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          labelAside={
            <button type="button" disabled title={COMING_SOON} className="av-link-btn fs-12">
              Quên mật khẩu?
            </button>
          }
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="av-icon-btn"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <div className="d-flex align-items-center justify-content-between">
          <label
            htmlFor="login-remember"
            title={COMING_SOON}
            className="d-flex align-items-center gap-2 fs-12 text-slate-500"
            style={{ cursor: 'not-allowed' }}
          >
            {/* Checkbox tuỳ biến để giữ màu teal như thiết kế dù đang vô hiệu hoá */}
            <input id="login-remember" type="checkbox" disabled defaultChecked className="visually-hidden" />
            <span aria-hidden="true" className="av-fake-check">
              <Check size={10} strokeWidth={3.5} />
            </span>
            Ghi nhớ phiên đăng nhập này
          </label>
          <span title={COMING_SOON} className="d-flex align-items-center gap-1 fs-12 fw-medium text-brand opacity-75">
            <Check size={14} aria-hidden="true" />
            2FA Enforced
          </span>
        </div>

        {submitError && <Alert variant="danger" className="av-alert">{submitError}</Alert>}

        <Button type="submit" variant="primary" disabled={isSubmitting} className="av-btn av-btn-lg">
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng Nhập Ngay'}
          {!isSubmitting && <ArrowRight size={16} aria-hidden="true" />}
        </Button>
      </form>

      <div className="av-info-box mt-4">
        <p className="d-flex align-items-center gap-2 mb-0 fs-10 av-mono-tag">
          <Info size={14} aria-hidden="true" />
          ROLE-BASED AUTOMATIC REDIRECT
        </p>
        <p className="mt-2 mb-0 fs-12 text-slate-500" style={{ lineHeight: 1.6 }}>
          Tùy theo tài khoản được cấp quyền: Vault Owner (quản trị di sản), Beneficiary (người nhận), Executor (bàn
          giao) hoặc Verifier (thẩm định pháp lý).
        </p>
      </div>

      <p className="mt-4 mb-0 text-center fs-13 text-slate-500">
        Chưa có kho lưu trữ di sản?{' '}
        <button type="button" onClick={onOpenRegister} className="av-link-btn">
          Đăng ký tạo Vault mới
        </button>
      </p>
    </section>
  )
}
