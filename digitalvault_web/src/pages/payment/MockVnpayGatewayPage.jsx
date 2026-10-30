import { ArrowLeft, Clock, CreditCard, Globe, Landmark, QrCode, ShieldCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  MOCK_VNPAY_DOMESTIC_CARDS,
  MOCK_VNPAY_OTP,
  MOCK_VNPAY_SIGNATURE,
  MOCK_VNPAY_TIMEOUT_MS,
  VNPAY_CODES,
} from '../../mocks/vnpayMock'
import { formatVnd } from '../../utils/payment'

// Trang giả lập cổng thanh toán VNPay khi chạy chế độ mock (BE thật trả paymentUrl của VNPay nên trang này không được dùng).
// Mô phỏng các bước như VNPay sandbox: chọn phương thức → chọn ngân hàng → nhập thẻ → nhập OTP. Không gửi dữ liệu thẻ đi đâu.

const METHODS = [
  { value: 'qr', label: 'Ứng dụng hỗ trợ VNPAY-QR', description: 'Quét mã bằng ứng dụng ngân hàng hoặc ví hỗ trợ VNPAY-QR.', icon: QrCode },
  { value: 'domestic', label: 'Thẻ nội địa và tài khoản ngân hàng', description: 'Thẻ ATM của các ngân hàng trong nước.', icon: Landmark },
  { value: 'international', label: 'Thẻ thanh toán quốc tế', description: 'Visa, Mastercard, JCB.', icon: Globe },
]

const BANKS = ['NCB', 'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank', 'MB Bank', 'ACB', 'VPBank', 'Sacombank']

const MAX_OTP_ATTEMPTS = 3
const EMPTY_CARD = { number: '', holder: '', date: '', cvv: '' }

const digitsOnly = (value) => value.replace(/\D/g, '')

// Thuật toán Luhn để kiểm tra số thẻ quốc tế
function isLuhnValid(number) {
  let sum = 0
  for (let i = 0; i < number.length; i += 1) {
    let digit = Number(number[number.length - 1 - i])
    if (i % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return number.length > 0 && sum % 10 === 0
}

// Kiểm tra thẻ nội địa theo bộ thẻ test; trả { error } hoặc { result: 'ok' | 'insufficient' }
function checkDomesticCard(bank, card) {
  const number = digitsOnly(card.number)
  if (!number) return { error: 'Vui lòng nhập số thẻ.' }
  if (!card.holder.trim()) return { error: 'Vui lòng nhập tên chủ thẻ.' }
  if (!/^\d{2}\/\d{2}$/.test(card.date.trim())) return { error: 'Ngày phát hành có dạng MM/YY.' }
  const match = MOCK_VNPAY_DOMESTIC_CARDS.find((item) => item.number === number)
  if (!match || match.holder !== card.holder.trim().toUpperCase() || match.issueDate !== card.date.trim()) {
    return { error: 'Thông tin thẻ không chính xác.' }
  }
  if (match.bank !== bank) return { error: `Thẻ không thuộc ngân hàng ${bank}.` }
  return { result: match.result }
}

// Kiểm tra thẻ quốc tế: số thẻ hợp lệ theo Luhn, hạn MM/YY chưa qua, CVV 3 số
function checkInternationalCard(card, now = new Date()) {
  const number = digitsOnly(card.number)
  if (number.length < 13 || number.length > 19 || !isLuhnValid(number)) return { error: 'Số thẻ không hợp lệ.' }
  if (!card.holder.trim()) return { error: 'Vui lòng nhập tên chủ thẻ.' }
  const match = /^(\d{2})\/(\d{2})$/.exec(card.date.trim())
  const month = match ? Number(match[1]) : 0
  if (!match || month < 1 || month > 12) return { error: 'Ngày hết hạn có dạng MM/YY.' }
  const expiry = new Date(2000 + Number(match[2]), month, 1)
  if (expiry <= now) return { error: 'Thẻ đã hết hạn.' }
  if (!/^\d{3}$/.test(card.cvv.trim())) return { error: 'CVV gồm 3 chữ số.' }
  return { result: 'ok' }
}

const formatClock = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function StepTitle({ onBack, children }) {
  return (
    <div className="d-flex align-items-center gap-2">
      {onBack && (
        <Button type="button" variant="light" size="sm" className="border" aria-label="Quay lại" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" />
        </Button>
      )}
      <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
        {children}
      </h2>
    </div>
  )
}

export default function MockVnpayGatewayPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reference = searchParams.get('vnp_TxnRef')
  const amountText = searchParams.get('vnp_Amount')
  const orderInfo = searchParams.get('vnp_OrderInfo')
  const hasOrder = Boolean(reference) && /^\d+$/.test(amountText ?? '')

  // step: method | qr | banks | card | otp
  const [step, setStep] = useState('method')
  const [cardType, setCardType] = useState('domestic')
  const [bank, setBank] = useState('')
  const [card, setCard] = useState(EMPTY_CARD)
  const [otp, setOtp] = useState('')
  const [otpAttempts, setOtpAttempts] = useState(0)
  const [error, setError] = useState('')
  const [deadline] = useState(() => Date.now() + MOCK_VNPAY_TIMEOUT_MS)
  const [now, setNow] = useState(() => Date.now())

  // Gửi khách về trang kết quả với các tham số như VNPay thật: 00/00 là thành công, mã khác kèm trạng thái 02 là thất bại
  const finish = useCallback(
    (responseCode) => {
      const query = new URLSearchParams({
        vnp_TxnRef: reference,
        vnp_Amount: amountText,
        vnp_ResponseCode: responseCode,
        vnp_TransactionStatus: responseCode === VNPAY_CODES.success ? '00' : '02',
        vnp_SecureHash: MOCK_VNPAY_SIGNATURE,
      })
      navigate(`/payment/vnpay-return?${query}`)
    },
    [reference, amountText, navigate],
  )

  // Đồng hồ hết hạn giao dịch như VNPay (15 phút); hết giờ thì trả mã 11
  useEffect(() => {
    if (!hasOrder) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [hasOrder])
  const remaining = deadline - now
  useEffect(() => {
    if (hasOrder && remaining <= 0) finish(VNPAY_CODES.expired)
  }, [hasOrder, remaining, finish])

  const goTo = (next) => {
    setError('')
    setStep(next)
  }

  const chooseMethod = (value) => {
    if (value === 'qr') return goTo('qr')
    setCardType(value)
    setCard(EMPTY_CARD)
    goTo(value === 'domestic' ? 'banks' : 'card')
  }

  const setCardField = (field) => (event) => setCard((prev) => ({ ...prev, [field]: event.target.value }))

  const submitCard = (event) => {
    event.preventDefault()
    const outcome = cardType === 'domestic' ? checkDomesticCard(bank, card) : checkInternationalCard(card)
    if (outcome.error) {
      setError(outcome.error)
      return
    }
    if (outcome.result === 'insufficient') {
      finish(VNPAY_CODES.insufficient)
      return
    }
    setOtp('')
    setOtpAttempts(0)
    goTo('otp')
  }

  const submitOtp = (event) => {
    event.preventDefault()
    if (otp.trim() === MOCK_VNPAY_OTP) {
      finish(VNPAY_CODES.success)
      return
    }
    const attempts = otpAttempts + 1
    if (attempts >= MAX_OTP_ATTEMPTS) {
      finish(VNPAY_CODES.wrongOtp)
      return
    }
    setOtpAttempts(attempts)
    setError(`Mã OTP không đúng. Bạn còn ${MAX_OTP_ATTEMPTS - attempts} lần thử.`)
  }

  const amount = hasOrder ? Number(amountText) / 100 : 0

  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center p-4">
      <section className="av-panel d-flex flex-column gap-4 w-100" style={{ maxWidth: 880 }}>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <span className="av-icon-tile">
              <Landmark size={20} aria-hidden="true" />
            </span>
            <div>
              <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
                Cổng thanh toán VNPay (giả lập)
              </h1>
              <p className="mb-0 fs-12 text-slate-500">Trang này chỉ dùng khi chạy chế độ mock, không trừ tiền thật và không gửi thông tin thẻ đi đâu.</p>
            </div>
          </div>
          {hasOrder && (
            <span className="d-inline-flex align-items-center gap-1 fs-12 text-slate-600" aria-label="Thời gian còn lại">
              <Clock size={14} aria-hidden="true" />
              {`Giao dịch hết hạn sau ${formatClock(remaining)}`}
            </span>
          )}
        </div>

        {!hasOrder ? (
          <>
            <Alert variant="danger" className="av-alert mb-0">Thiếu thông tin đơn hàng. Hãy quay lại trang Gói dịch vụ và chọn thanh toán lại.</Alert>
            <div className="d-flex justify-content-end">
              <Button type="button" variant="light" className="av-btn av-btn-md border" disabled>
                Hủy giao dịch
              </Button>
            </div>
          </>
        ) : (
          <div className="row g-4">
            {/* Thông tin đơn hàng */}
            <div className="col-12 col-md-5">
              <div className="av-info-box d-flex flex-column gap-3 h-100" style={{ padding: 16 }}>
                <p className="mb-0 av-section-title">THÔNG TIN ĐƠN HÀNG</p>
                <dl className="mb-0 d-flex flex-column gap-2 fs-13">
                  <div className="d-flex justify-content-between gap-3">
                    <dt className="text-slate-500 fw-normal">Mã giao dịch</dt>
                    <dd className="mb-0 font-mono text-ink text-break text-end">{reference}</dd>
                  </div>
                  <div className="d-flex justify-content-between gap-3">
                    <dt className="text-slate-500 fw-normal">Số tiền</dt>
                    <dd className="mb-0 fw-semibold text-ink">{formatVnd(amount)}</dd>
                  </div>
                  {orderInfo && (
                    <div className="d-flex justify-content-between gap-3">
                      <dt className="text-slate-500 fw-normal">Nội dung</dt>
                      <dd className="mb-0 text-ink text-end">{orderInfo}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-auto">
                  <Button type="button" variant="light" className="av-btn av-btn-md border w-100" onClick={() => finish(VNPAY_CODES.cancelled)}>
                    Hủy giao dịch
                  </Button>
                </div>
              </div>
            </div>

            {/* Các bước thanh toán */}
            <div className="col-12 col-md-7 d-flex flex-column gap-3">
              {step === 'method' && (
                <>
                  <StepTitle>Chọn phương thức thanh toán</StepTitle>
                  <div className="d-flex flex-column gap-2">
                    {METHODS.map(({ value, label, description, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        className="d-flex align-items-center gap-3 text-start bg-white border rounded-3 w-100"
                        style={{ padding: 14 }}
                        onClick={() => chooseMethod(value)}
                      >
                        <span className="av-icon-tile" style={{ width: 36, height: 36 }}>
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className="d-flex flex-column">
                          <span className="fs-14 fw-semibold text-ink">{label}</span>
                          <span className="fs-12 text-slate-500">{description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 'qr' && (
                <>
                  <StepTitle onBack={() => goTo('method')}>Quét mã VNPAY-QR</StepTitle>
                  <figure className="mb-0 align-self-center p-3 bg-white border rounded-3" aria-label="Mã VNPAY-QR giả lập">
                    <QRCodeSVG value={`vnpay-mock://pay?ref=${reference}&amount=${amountText}`} size={180} marginSize={1} />
                  </figure>
                  <p className="mb-0 fs-12 text-slate-500 text-center">
                    Đây là mã giả lập nên không quét được bằng ứng dụng thật. Bấm nút bên dưới để mô phỏng việc quét mã và xác nhận trên điện thoại.
                  </p>
                  <Button type="button" variant="primary" className="av-btn av-btn-md" onClick={() => finish(VNPAY_CODES.success)}>
                    Mô phỏng: đã quét mã và thanh toán
                  </Button>
                </>
              )}

              {step === 'banks' && (
                <>
                  <StepTitle onBack={() => goTo('method')}>Chọn ngân hàng</StepTitle>
                  <div className="row g-2" role="list" aria-label="Danh sách ngân hàng">
                    {BANKS.map((name) => (
                      <div key={name} className="col-6 col-lg-4" role="listitem">
                        <button
                          type="button"
                          className="w-100 bg-white border rounded-3 fs-13 fw-semibold text-ink"
                          style={{ padding: '12px 8px' }}
                          onClick={() => {
                            setBank(name)
                            goTo('card')
                          }}
                        >
                          {name}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mb-0 fs-11 text-slate-500">Môi trường thử nghiệm: hãy chọn ngân hàng NCB và dùng thẻ test ở bước sau.</p>
                </>
              )}

              {step === 'card' && (
                <form className="d-flex flex-column gap-3" onSubmit={submitCard} noValidate>
                  <StepTitle onBack={() => goTo(cardType === 'domestic' ? 'banks' : 'method')}>
                    {cardType === 'domestic' ? `Thẻ ATM ${bank}` : 'Thẻ thanh toán quốc tế'}
                  </StepTitle>
                  <Form.Group controlId="mock-card-number">
                    <Form.Label className="av-label">Số thẻ</Form.Label>
                    <Form.Control inputMode="numeric" autoComplete="off" value={card.number} onChange={setCardField('number')} placeholder={cardType === 'domestic' ? '9704 ...' : '4111 1111 1111 1111'} />
                  </Form.Group>
                  <Form.Group controlId="mock-card-holder">
                    <Form.Label className="av-label">Tên chủ thẻ</Form.Label>
                    <Form.Control autoComplete="off" value={card.holder} onChange={setCardField('holder')} placeholder="NGUYEN VAN A" />
                  </Form.Group>
                  <div className="row g-3">
                    <Form.Group className="col" controlId="mock-card-date">
                      <Form.Label className="av-label">{cardType === 'domestic' ? 'Ngày phát hành' : 'Ngày hết hạn'}</Form.Label>
                      <Form.Control autoComplete="off" value={card.date} onChange={setCardField('date')} placeholder="MM/YY" />
                    </Form.Group>
                    {cardType === 'international' && (
                      <Form.Group className="col" controlId="mock-card-cvv">
                        <Form.Label className="av-label">CVV</Form.Label>
                        <Form.Control inputMode="numeric" autoComplete="off" value={card.cvv} onChange={setCardField('cvv')} placeholder="123" />
                      </Form.Group>
                    )}
                  </div>
                  {error && <Alert variant="danger" className="av-alert mb-0">{error}</Alert>}
                  <Button type="submit" variant="primary" className="av-btn av-btn-md">
                    <CreditCard size={16} aria-hidden="true" />
                    Tiếp tục
                  </Button>

                  <div className="av-info-box fs-12" style={{ padding: 12 }}>
                    <p className="mb-1 fw-semibold text-ink">Thẻ test (môi trường giả lập)</p>
                    {cardType === 'domestic' ? (
                      <ul className="mb-0 ps-3 text-slate-600">
                        {MOCK_VNPAY_DOMESTIC_CARDS.map((item) => (
                          <li key={item.number}>
                            <span className="font-mono">{item.number}</span>
                            {` · ${item.holder} · ${item.issueDate} (ngân hàng ${item.bank}): ${item.note}`}
                          </li>
                        ))}
                        <li>{`Mã OTP: ${MOCK_VNPAY_OTP}`}</li>
                      </ul>
                    ) : (
                      <p className="mb-0 text-slate-600">
                        Dùng số thẻ hợp lệ bất kỳ, ví dụ <span className="font-mono">4111 1111 1111 1111</span>, hạn dùng trong tương lai, CVV 3 số. Mã OTP: {MOCK_VNPAY_OTP}.
                      </p>
                    )}
                  </div>
                </form>
              )}

              {step === 'otp' && (
                <form className="d-flex flex-column gap-3" onSubmit={submitOtp} noValidate>
                  <StepTitle onBack={() => goTo('card')}>Xác thực OTP</StepTitle>
                  <p className="mb-0 fs-13 text-slate-600">
                    {`Mã OTP đã được gửi tới số điện thoại đăng ký thẻ ${digitsOnly(card.number).slice(-4).padStart(8, '•')}. Vui lòng nhập mã để hoàn tất thanh toán ${formatVnd(amount)}.`}
                  </p>
                  <Form.Group controlId="mock-otp">
                    <Form.Label className="av-label">Mã OTP</Form.Label>
                    <Form.Control inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(digitsOnly(event.target.value))} placeholder="••••••" />
                  </Form.Group>
                  {error && <Alert variant="danger" className="av-alert mb-0">{error}</Alert>}
                  <Button type="submit" variant="primary" className="av-btn av-btn-md" disabled={otp.length < 6}>
                    Thanh toán
                  </Button>
                  <p className="mb-0 fs-11 text-slate-500">{`Môi trường giả lập: mã OTP đúng là ${MOCK_VNPAY_OTP}. Nhập sai ${MAX_OTP_ATTEMPTS} lần thì giao dịch thất bại.`}</p>
                </form>
              )}

              <p className="mb-0 mt-auto d-flex align-items-center gap-2 fs-11 text-slate-500">
                <ShieldCheck size={13} aria-hidden="true" className="text-brand" />
                Mô phỏng giao diện VNPay sandbox. Trên môi trường thật, các bước này diễn ra trên trang của VNPay.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
