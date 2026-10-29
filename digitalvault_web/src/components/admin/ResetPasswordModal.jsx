import { KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { resetUserPassword } from '../../callapi/adminApi'
import { adminErrorMessage, validateNewPassword } from '../../utils/admin'
import TextField from '../common/TextField'

// Hộp thoại Admin đặt lại mật khẩu cho một người dùng (khi họ quên và không dùng được luồng quên mật khẩu); chỉ mount khi mở
export default function ResetPasswordModal({ user, onClose, onReset }) {
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = {}
    const passwordError = validateNewPassword(form.password)
    if (passwordError) nextErrors.password = passwordError
    else if (form.confirm !== form.password) nextErrors.confirm = 'Mật khẩu nhập lại không khớp.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      await resetUserPassword(user.userId, form.password)
      onReset()
    } catch (caught) {
      setBusy(false)
      setSubmitError(adminErrorMessage(caught))
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="reset-password-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="reset-password-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Đặt Lại Mật Khẩu
            </h2>
            <p className="mb-0 fs-12 text-slate-500">{`${user.fullName} · ${user.email}`}</p>
          </div>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-3">
          <p className="mb-0 fs-13 text-slate-500">Mật khẩu mới có hiệu lực ngay và tài khoản được mở khóa nếu đang bị khóa do đăng nhập sai. Hãy gửi mật khẩu cho người dùng qua kênh an toàn.</p>
          <TextField
            id="reset-password"
            name="password"
            type="password"
            label="Mật khẩu mới"
            required
            autoComplete="new-password"
            placeholder="Tối thiểu 12 ký tự"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />
          <TextField
            id="reset-password-confirm"
            name="confirm"
            type="password"
            label="Nhập lại mật khẩu mới"
            required
            autoComplete="new-password"
            value={form.confirm}
            onChange={handleChange}
            error={errors.confirm}
          />
          {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={busy} className="av-btn av-btn-md">
            {busy ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
