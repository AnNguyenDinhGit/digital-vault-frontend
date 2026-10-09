import { ArrowRight, Check, Eye, EyeOff, Info, Lock, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { validateLogin } from '../../utils/validators'
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
      // Bản v1 chỉ có khu vực Owner; các vai trò khác sẽ bổ sung sau
      if (user.roles.includes('Owner')) navigate('/owner/assets', { replace: true })
      else setSubmitError('Phiên bản hiện tại chưa hỗ trợ vai trò của bạn. Vui lòng quay lại sau.')
    } catch (error) {
      setSubmitError(loginErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      id="login"
      className="w-full max-w-[480px] rounded-2xl border border-slate-200 bg-white px-8 pb-8 pt-9 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.18)]"
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary-tint text-primary">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[22px] font-bold tracking-tight text-ink">Đăng Nhập Cổng An Toàn</h2>
        <p className="mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-slate-500">
          Hệ thống tự động xác định vai trò và điều hướng đến không gian làm việc của bạn
        </p>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-primary/20 bg-primary-tint px-3.5 py-2.5 text-[13px] text-primary"
        >
          {notice}
        </p>
      )}

      <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
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
            <button
              type="button"
              disabled
              title={COMING_SOON}
              className="text-[12px] font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Quên mật khẩu?
            </button>
          }
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="flex items-center justify-between">
          <label
            htmlFor="login-remember"
            title={COMING_SOON}
            className="flex cursor-not-allowed items-center gap-2 text-[12px] text-slate-500"
          >
            {/* Checkbox tuỳ biến để giữ màu teal như thiết kế dù đang vô hiệu hoá */}
            <input id="login-remember" type="checkbox" disabled defaultChecked className="peer sr-only" />
            <span
              aria-hidden="true"
              className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-primary text-white"
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
            </span>
            Ghi nhớ phiên đăng nhập này
          </label>
          <span title={COMING_SOON} className="flex items-center gap-1 text-[12px] font-medium text-primary/70">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            2FA Enforced
          </span>
        </div>

        {submitError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng Nhập Ngay'}
          {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-primary/15 bg-primary-tint/70 px-4 py-3.5">
        <p className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.12em] text-primary">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          ROLE-BASED AUTOMATIC REDIRECT
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
          Tùy theo tài khoản được cấp quyền: Vault Owner (quản trị di sản), Beneficiary (người nhận), Executor (bàn
          giao) hoặc Verifier (thẩm định pháp lý).
        </p>
      </div>

      <p className="mt-6 text-center text-[13px] text-slate-500">
        Chưa có kho lưu trữ di sản?{' '}
        <button type="button" onClick={onOpenRegister} className="font-semibold text-primary hover:underline">
          Đăng ký tạo Vault mới
        </button>
      </p>
    </section>
  )
}
