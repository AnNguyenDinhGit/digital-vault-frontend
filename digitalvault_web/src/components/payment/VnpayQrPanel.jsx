import { CheckCircle2, ExternalLink, QrCode, RefreshCw, XCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { getMyTransactions } from '../../callapi/paymentApi'
import { formatVnd } from '../../utils/payment'

export const QR_POLL_MS = 3000

// Link thanh toán dạng tuyệt đối để điện thoại mở được (mock trả đường dẫn tương đối /payment/mock-vnpay?...)
function absoluteUrl(url) {
  try {
    return new URL(url, window.location.origin).href
  } catch {
    return url
  }
}

const isLocalHost = (url) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(url)

// Thanh toán bằng mã QR: mã chứa link thanh toán VNPay của giao dịch vừa tạo, quét bằng điện thoại để trả tiền.
// Trang này tự hỏi BE trạng thái giao dịch (GET /payments/me/transactions) cho tới khi có kết quả, vì kết quả do VNPay
// báo cho BE (IPN / trang return trên điện thoại) chứ không về trình duyệt đang mở trang này.
export default function VnpayQrPanel({ checkout, onNewCode, onCancel, pollMs = QR_POLL_MS }) {
  const [status, setStatus] = useState('Pending')
  const [checking, setChecking] = useState(false)
  const url = absoluteUrl(checkout.paymentUrl)

  const check = useCallback(async () => {
    try {
      const { items } = await getMyTransactions({ page: 1, pageSize: 20 })
      const found = items.find((item) => item.transactionCode === checkout.transactionCode)
      if (found && found.status !== 'Pending') setStatus(found.status)
    } catch {
      // Lỗi mạng tạm thời: lần hỏi sau sẽ thử lại
    }
  }, [checkout.transactionCode])

  useEffect(() => {
    if (status !== 'Pending') return undefined
    const timer = setInterval(check, pollMs)
    return () => clearInterval(timer)
  }, [status, check, pollMs])

  const checkNow = async () => {
    setChecking(true)
    await check()
    setChecking(false)
  }

  if (status === 'Success') {
    return (
      <div className="d-flex flex-column align-items-center gap-2 text-center" role="status">
        <CheckCircle2 size={44} aria-hidden="true" className="text-brand" />
        <p className="mb-0 fw-bold text-ink" style={{ fontSize: 18 }}>
          Thanh toán thành công
        </p>
        <p className="mb-0 fs-13 text-slate-500">Gói dịch vụ mới đã được kích hoạt.</p>
        <Button as={Link} to="/owner/plans" variant="primary" className="av-btn av-btn-md mt-2">
          Về trang Gói dịch vụ
        </Button>
      </div>
    )
  }

  if (status === 'Failed') {
    return (
      <div className="d-flex flex-column align-items-center gap-2 text-center" role="status">
        <XCircle size={44} aria-hidden="true" className="text-danger" />
        <p className="mb-0 fw-bold text-ink" style={{ fontSize: 18 }}>
          Thanh toán thất bại
        </p>
        <p className="mb-0 fs-13 text-slate-500">Giao dịch không thành công hoặc đã bị hủy, bạn không bị trừ tiền.</p>
        <div className="d-flex gap-2 mt-2">
          <Button type="button" variant="light" className="av-btn av-btn-md border" onClick={onCancel}>
            Đóng
          </Button>
          <Button type="button" variant="primary" className="av-btn av-btn-md" onClick={onNewCode}>
            Tạo mã mới
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column align-items-center gap-3 text-center">
      <p className="mb-0 d-flex align-items-center gap-2 fw-bold text-ink" style={{ fontSize: 16 }}>
        <QrCode size={18} aria-hidden="true" className="text-brand" />
        Quét mã để thanh toán
      </p>
      <figure className="mb-0 p-3 bg-white border rounded-3" aria-label="Mã QR thanh toán">
        <QRCodeSVG value={url} size={200} level="M" marginSize={1} title="Mã QR thanh toán VNPay" />
      </figure>
      <div className="fs-13">
        <p className="mb-0 fw-bold text-ink" style={{ fontSize: 20 }}>
          {formatVnd(checkout.amount)}
        </p>
        <p className="mb-0 font-mono fs-11 text-slate-500 text-break">{`Mã giao dịch: ${checkout.transactionCode}`}</p>
      </div>
      <p className="mb-0 fs-12 text-slate-500">
        Mở camera hoặc ứng dụng ngân hàng trên điện thoại để quét mã, rồi hoàn tất thanh toán trên trang VNPay. Mã chỉ dùng cho giao dịch này. Nếu mã hết hạn, hãy tạo mã mới.
      </p>
      {isLocalHost(url) && (
        <p className="mb-0 fs-11 text-slate-500">Đang chạy trên localhost nên điện thoại không mở được link này. Để thử, hãy bấm &quot;Mở trong tab mới&quot;.</p>
      )}
      <p role="status" className="mb-0 d-flex align-items-center gap-2 fs-12 text-slate-600">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang chờ thanh toán. Trang sẽ tự cập nhật khi có kết quả.
      </p>
      <div className="d-flex flex-wrap justify-content-center gap-2">
        <Button as="a" href={url} target="_blank" rel="noopener noreferrer" variant="light" size="sm" className="border d-inline-flex align-items-center gap-1">
          <ExternalLink size={14} aria-hidden="true" />
          Mở trong tab mới
        </Button>
        <Button type="button" variant="light" size="sm" className="border d-inline-flex align-items-center gap-1" disabled={checking} onClick={checkNow}>
          <RefreshCw size={14} aria-hidden="true" className={checking ? 'av-spin' : undefined} />
          Kiểm tra ngay
        </Button>
        <Button type="button" variant="light" size="sm" className="border" onClick={onNewCode}>
          Tạo mã mới
        </Button>
        <Button type="button" variant="link" size="sm" className="text-slate-500" onClick={onCancel}>
          Hủy
        </Button>
      </div>
    </div>
  )
}

