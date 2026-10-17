import { ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { useAuth } from '../../hooks/useAuth'
import { MOCK_MODE } from '../../mocks/mode'
import { validateOtp } from '../../utils/validators'
import MockNotice from '../common/MockNotice'
import TextField from '../common/TextField'

const GENERIC_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại.'
const CHANGED_MESSAGE = 'Tài khoản đã thay đổi. Vui lòng đăng nhập lại.'

const HELP = {
  Email: 'Nhập mã 6 chữ số vừa được gửi tới email của bạn.',
  TOTP: 'Mở ứng dụng xác thực (authenticator) và nhập mã 6 chữ số hiện tại.',
}

// Chuyển lỗi BE khi xác minh mã sang thông báo tiếng Việt; 400 hiện ngay dưới ô nhập, còn lại hiện thành cảnh báo
function verifyError(error) {
  if (error?.status === 400) return { field: 'Mã xác thực không đúng hoặc đã hết hạn.' }
  if (error?.status === 409) return { alert: CHANGED_MESSAGE }
  if (error?.status === 429) return { alert: 'Bạn đã thử quá nhiều lần. Vui lòng đợi 1 phút rồi thử lại.' }
  if (error?.status === 503) return { alert: 'Không thể xác thực hai lớp lúc này. Vui lòng thử lại sau.' }
  return { alert: error?.message || GENERIC_ERROR }
}

function resendError(error) {
  if (error?.status === 429) return 'Vui lòng đợi 1 phút rồi gửi lại mã.'
  if (error?.status === 503) return 'Không gửi được email xác thực. Vui lòng thử lại sau.'
  if (error?.status === 409) return CHANGED_MESSAGE
  if (error?.status === 400) return 'Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.'
  return error?.message || GENERIC_ERROR
}

// Hộp thoại nhập mã xác thực hai lớp sau khi đăng nhập trả 202. Chỉ mount khi cần.
export default function TwoFactorModal({ challenge: initialChallenge, email, mockMode = MOCK_MODE, onVerified, onClose }) {
  const { verifyTwoFactor, resendTwoFactor } = useAuth()
  const [challenge, setChallenge] = useState(initialChallenge)
  const [code, setCode] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [alert, setAlert] = useState('')
  const [busy, setBusy] = useState(false)

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (busy) return
    const validation = validateOtp(code)
    setFieldError(validation.otp ?? '')
    setAlert('')
    if (validation.otp) return
    setBusy(true)
    try {
      onVerified(await verifyTwoFactor(challenge.challengeId, code, email))
    } catch (error) {
      const { field, alert: message } = verifyError(error)
      setFieldError(field ?? '')
      setAlert(message ?? '')
      setBusy(false)
    }
  }

  const handleResend = async () => {
    setBusy(true)
    setAlert('')
    setFieldError('')
    try {
      setChallenge(await resendTwoFactor(challenge.challengeId))
      setCode('')
    } catch (error) {
      setAlert(resendError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="two-factor-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <h2 id="two-factor-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Xác Thực Hai Lớp
          </h2>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-3">
          <p className="mb-0 fs-13 text-slate-600">{HELP[challenge.method] ?? HELP.Email}</p>
          {challenge.mockCode && <MockNotice mode={mockMode} message={`Mã xác thực mô phỏng: ${challenge.mockCode}`} />}
          <TextField
            id="two-factor-code"
            name="code"
            inputMode="numeric"
            maxLength={6}
            label="Mã xác thực"
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value)
              setFieldError('')
            }}
            error={fieldError}
          />
          {challenge.method === 'Email' && (
            <div>
              <button type="button" className="av-link-btn fs-12" disabled={busy} onClick={handleResend}>
                Gửi lại mã
              </button>
            </div>
          )}
          {alert && <Alert variant="danger" className="av-alert mb-0">{alert}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={busy} className="av-btn av-btn-md">
            {busy ? 'Đang xử lý dữ liệu...' : 'Xác nhận'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
