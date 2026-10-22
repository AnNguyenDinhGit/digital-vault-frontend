import { KeyRound, MailCheck, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { requestBeneficiaryOtp, verifyBeneficiaryOtp } from '../../callapi/beneficiaryApi'
import { MOCK_MODE } from '../../mocks/mode'
import { formatCountdown, otpRequestErrorMessage, otpVerifyError, secondsUntil } from '../../utils/beneficiary'
import { validateOtp } from '../../utils/validators'
import MockNotice from '../common/MockNotice'

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 30
const EMPTY_DIGITS = Array.from({ length: OTP_LENGTH }, () => '')

// Hộp thoại cổng xác thực OTP: tự yêu cầu mã khi mở (POST /beneficiary/otp/request), nhập 6 chữ số rồi xác minh (POST /beneficiary/otp/verify)
export default function BeneficiaryOtpModal({ email, mockMode = MOCK_MODE, onVerified, onClose }) {
  const [challenge, setChallenge] = useState(null)
  const [digits, setDigits] = useState(EMPTY_DIGITS)
  const [fieldError, setFieldError] = useState('')
  const [alert, setAlert] = useState('')
  const [requesting, setRequesting] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [sentAt, setSentAt] = useState(null)
  const inputsRef = useRef([])
  const requestedRef = useRef(false)

  const sendCode = async () => {
    setRequesting(true)
    setAlert('')
    setFieldError('')
    try {
      const next = await requestBeneficiaryOtp()
      setChallenge(next)
      setDigits(EMPTY_DIGITS)
      setSentAt(Date.now())
      setNow(Date.now())
      inputsRef.current[0]?.focus()
    } catch (error) {
      setAlert(otpRequestErrorMessage(error))
    } finally {
      setRequesting(false)
    }
  }

  // Gửi mã ngay khi mở hộp thoại (chặn gọi hai lần ở StrictMode)
  useEffect(() => {
    if (requestedRef.current) return
    requestedRef.current = true
    sendCode()
  }, [])

  // Đồng hồ đếm ngược thời hạn mã và thời gian chờ gửi lại
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const busy = requesting || verifying
  const remaining = challenge?.expiresAt ? secondsUntil(challenge.expiresAt, now) : 0
  const expired = Boolean(challenge) && remaining === 0
  const cooldown = sentAt ? Math.max(0, RESEND_COOLDOWN_SECONDS - Math.floor((now - sentAt) / 1000)) : 0
  const code = digits.join('')

  const handleClose = () => {
    if (!verifying) onClose()
  }

  const focusBox = (index) => inputsRef.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))]?.focus()

  const fillFrom = (index, text) => {
    const chars = text.replace(/\D/g, '').slice(0, OTP_LENGTH - index).split('')
    if (chars.length === 0) return
    setDigits((current) => {
      const next = [...current]
      chars.forEach((char, offset) => {
        next[index + offset] = char
      })
      return next
    })
    setFieldError('')
    focusBox(index + chars.length)
  }

  const handleChange = (index, value) => {
    if (value === '') {
      setDigits((current) => current.map((digit, i) => (i === index ? '' : digit)))
      return
    }
    fillFrom(index, value)
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      setDigits((current) => current.map((digit, i) => (i === index - 1 ? '' : digit)))
      focusBox(index - 1)
    } else if (event.key === 'ArrowLeft') {
      focusBox(index - 1)
    } else if (event.key === 'ArrowRight') {
      focusBox(index + 1)
    }
  }

  const handlePaste = (index, event) => {
    event.preventDefault()
    fillFrom(index, event.clipboardData.getData('text'))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (busy || !challenge) return
    const validation = validateOtp(code)
    setFieldError(validation.otp ?? '')
    setAlert('')
    if (validation.otp) return
    if (expired) {
      setAlert('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.')
      return
    }
    setVerifying(true)
    try {
      await verifyBeneficiaryOtp(challenge.challengeId, code)
      onVerified()
    } catch (error) {
      const { field, alert: message } = otpVerifyError(error)
      setFieldError(field ?? '')
      setAlert(message ?? '')
      setVerifying(false)
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} backdrop="static" dialogClassName="av-modal av-otp-modal" aria-labelledby="beneficiary-otp-title">
      <div className="av-modal-head av-otp-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile av-otp-shield">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="mb-1 av-mono-tag fs-10">BENEFICIARY GATE · OTP</p>
            <h2 id="beneficiary-otp-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Cổng Xác Thực Người Thụ Hưởng
            </h2>
          </div>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn" disabled={verifying}>
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-3">
          <div className="av-info-box d-flex align-items-start gap-3">
            <MailCheck size={18} className="text-brand flex-shrink-0 mt-1" aria-hidden="true" />
            <p className="mb-0 fs-13 text-slate-600" style={{ lineHeight: 1.6 }}>
              {requesting && !challenge
                ? 'Đang gửi mã xác thực một lần (OTP)...'
                : (
                    <>
                      Mã OTP gồm 6 chữ số đã được gửi tới {email ? <strong className="text-ink">{email}</strong> : 'email của bạn'}. Nhập mã để mở khóa dữ liệu di sản
                      được phân bổ cho bạn.
                    </>
                  )}
            </p>
          </div>

          {challenge?.mockCode && <MockNotice mode={mockMode} message={`Mã OTP mô phỏng: ${challenge.mockCode}`} />}

          <fieldset disabled={!challenge || verifying}>
            <legend className="av-label mb-2 d-flex align-items-center gap-2">
              <KeyRound size={14} aria-hidden="true" />
              Mã OTP
              <span className="ms-1 text-danger"> *</span>
            </legend>
            <div className="av-otp-inputs" role="group" aria-describedby={fieldError ? 'beneficiary-otp-error' : undefined}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  id={`beneficiary-otp-${index}`}
                  ref={(element) => {
                    inputsRef.current[index] = element
                  }}
                  className={`av-otp-box${digit ? ' is-filled' : ''}${fieldError ? ' is-invalid' : ''}`}
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={OTP_LENGTH}
                  aria-label={`Chữ số thứ ${index + 1}`}
                  value={digit}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={(event) => handlePaste(index, event)}
                  onFocus={(event) => event.target.select()}
                />
              ))}
            </div>
            {fieldError && (
              <p id="beneficiary-otp-error" className="av-error">
                {fieldError}
              </p>
            )}
          </fieldset>

          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 fs-12">
            <span className={`av-otp-timer${expired ? ' is-expired' : ''}`} aria-live="polite">
              {challenge ? (expired ? 'Mã đã hết hạn' : `Mã hết hạn sau ${formatCountdown(remaining)}`) : '—'}
            </span>
            <button type="button" className="av-link-btn fs-12 d-inline-flex align-items-center gap-1" disabled={busy || cooldown > 0} onClick={sendCode}>
              <RefreshCw size={12} aria-hidden="true" className={requesting ? 'av-spin' : undefined} />
              {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : 'Gửi lại mã'}
            </button>
          </div>

          {alert && <Alert variant="danger" className="av-alert mb-0">{alert}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={verifying} className="av-btn av-btn-md border">
            Để sau
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !challenge || code.length < OTP_LENGTH} className="av-btn av-btn-md">
            {verifying ? 'Đang xác thực...' : 'Xác thực & mở khóa'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
