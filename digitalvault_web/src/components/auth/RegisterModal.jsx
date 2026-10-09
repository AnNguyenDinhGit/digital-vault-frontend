import { HardDrive, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { register } from '../../callapi/authApi'
import { validateRegister } from '../../utils/validators'
import TextField from '../common/TextField'

const EMPTY_FORM = { fullName: '', email: '', phone: '', password: '', confirmPassword: '', acceptTerms: false }

// Chuyển lỗi API đăng ký sang thông báo tiếng Việt
function registerErrorMessage(error) {
  if (error?.status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng đợi 1 phút rồi thử lại.'
  if (error?.status === 400) return 'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

// Modal đăng ký tài khoản Vault Owner, hiển thị đè lên landing page
export default function RegisterModal({ open, onClose, onSuccess, onSwitchToLogin }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Đóng modal bằng phím Esc
  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateRegister(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const email = form.email.trim()
    setIsSubmitting(true)
    try {
      await register({
        fullName: form.fullName.trim(),
        email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
      })
      setForm(EMPTY_FORM)
      onSuccess(email)
    } catch (error) {
      if (error?.status === 409) setErrors((prev) => ({ ...prev, email: 'Email này đã được đăng ký.' }))
      else setSubmitError(registerErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
        className="w-full max-w-[680px] overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)]"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-8 py-6">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary-tint text-primary">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <span className="inline-block rounded-md bg-primary-soft px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] text-primary">
                VAULT OWNER SETUP
              </span>
              <h2 id="register-title" className="mt-1 text-[19px] font-bold tracking-tight text-ink">
                Đăng Ký Tạo Kho Di Sản Số Mới
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-x-5 gap-y-5 px-8 py-6 sm:grid-cols-2">
            <TextField
              id="register-fullName"
              name="fullName"
              label="Họ và tên chủ sở hữu"
              required
              autoComplete="name"
              placeholder="Ví dụ: Nguyễn Văn An"
              value={form.fullName}
              onChange={handleChange}
              inputClassName="h-10! text-[13px]!"
              error={errors.fullName}
              className="sm:col-span-2"
            />
            <TextField
              id="register-email"
              name="email"
              type="email"
              label="Email chính thức"
              required
              autoComplete="email"
              placeholder="an.nguyen@example.com"
              value={form.email}
              onChange={handleChange}
              inputClassName="h-10! text-[13px]!"
              error={errors.email}
            />
            <TextField
              id="register-phone"
              name="phone"
              type="tel"
              label="Số điện thoại (Nhận OTP)"
              required
              autoComplete="tel"
              placeholder="0901 234 567"
              value={form.phone}
              onChange={handleChange}
              inputClassName="h-10! text-[13px]!"
              error={errors.phone}
            />
            <TextField
              id="register-password"
              name="password"
              type="password"
              label="Mật khẩu tài khoản"
              required
              autoComplete="new-password"
              placeholder="Tối thiểu 12 ký tự, có số & ký tự đặc biệt"
              value={form.password}
              onChange={handleChange}
              inputClassName="h-10! text-[13px]!"
              error={errors.password}
            />
            <TextField
              id="register-confirmPassword"
              name="confirmPassword"
              type="password"
              label="Xác nhận mật khẩu"
              required
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              value={form.confirmPassword}
              onChange={handleChange}
              inputClassName="h-10! text-[13px]!"
              error={errors.confirmPassword}
            />

            <div className="sm:col-span-2">
              <label
                htmlFor="register-acceptTerms"
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[13px] leading-relaxed text-slate-600"
              >
                <input
                  id="register-acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  checked={form.acceptTerms}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-primary"
                />
                <span>
                  Tôi đồng ý với <span className="font-semibold text-primary">Điều khoản dịch vụ</span> và xác nhận chịu
                  trách nhiệm pháp lý về quyền sở hữu đối với các tài sản số lưu trữ trong kho.
                </span>
              </label>
              {errors.acceptTerms && <p className="mt-1.5 text-[12px] text-red-600">{errors.acceptTerms}</p>}
            </div>

            {submitError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700 sm:col-span-2"
              >
                {submitError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-8 py-5">
            <p className="text-[13px] text-slate-500">
              Đã có tài khoản?{' '}
              <button type="button" onClick={onSwitchToLogin} className="font-semibold text-primary hover:underline">
                Đăng nhập ngay
              </button>
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo Kho Di Sản Ngay'}
              {!isSubmitting && <HardDrive className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
