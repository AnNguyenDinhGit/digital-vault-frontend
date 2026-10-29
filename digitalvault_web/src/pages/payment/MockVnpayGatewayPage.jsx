import { Landmark } from 'lucide-react'
import { Alert, Button } from 'react-bootstrap'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MOCK_VNPAY_SIGNATURE } from '../../mocks/vnpayMock'
import { formatVnd } from '../../utils/payment'

// Trang giả lập cổng thanh toán VNPay khi chạy chế độ mock (BE thật trả paymentUrl của VNPay nên trang này không được dùng)
export default function MockVnpayGatewayPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reference = searchParams.get('vnp_TxnRef')
  const amountText = searchParams.get('vnp_Amount')
  const orderInfo = searchParams.get('vnp_OrderInfo')
  const hasOrder = Boolean(reference) && /^\d+$/.test(amountText ?? '')

  // Gửi khách về trang kết quả với các tham số như VNPay thật: 00/00 là thành công, 24/02 là khách hủy giao dịch
  const finish = (responseCode, transactionStatus) => {
    const query = new URLSearchParams({
      vnp_TxnRef: reference,
      vnp_Amount: amountText,
      vnp_ResponseCode: responseCode,
      vnp_TransactionStatus: transactionStatus,
      vnp_SecureHash: MOCK_VNPAY_SIGNATURE,
    })
    navigate(`/payment/vnpay-return?${query}`)
  }

  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center p-4">
      <section className="av-panel d-flex flex-column gap-4 w-100" style={{ maxWidth: 520 }}>
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <Landmark size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Cổng thanh toán VNPay (giả lập)
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Trang này chỉ dùng khi chạy chế độ mock, không trừ tiền thật.</p>
          </div>
        </div>

        {hasOrder ? (
          <dl className="mb-0 d-flex flex-column gap-2 fs-13">
            <div className="d-flex justify-content-between gap-3">
              <dt className="text-slate-500">Mã giao dịch</dt>
              <dd className="mb-0 font-mono text-ink text-break">{reference}</dd>
            </div>
            <div className="d-flex justify-content-between gap-3">
              <dt className="text-slate-500">Số tiền</dt>
              <dd className="mb-0 fw-semibold text-ink">{formatVnd(Number(amountText) / 100)}</dd>
            </div>
            {orderInfo && (
              <div className="d-flex justify-content-between gap-3">
                <dt className="text-slate-500">Nội dung</dt>
                <dd className="mb-0 text-ink">{orderInfo}</dd>
              </div>
            )}
          </dl>
        ) : (
          <Alert variant="danger" className="av-alert mb-0">Thiếu thông tin đơn hàng. Hãy quay lại trang Gói dịch vụ và chọn thanh toán lại.</Alert>
        )}

        <div className="d-flex flex-wrap justify-content-end gap-2">
          <Button type="button" variant="light" className="av-btn av-btn-md border" disabled={!hasOrder} onClick={() => finish('24', '02')}>
            Hủy giao dịch
          </Button>
          <Button type="button" variant="primary" className="av-btn av-btn-md" disabled={!hasOrder} onClick={() => finish('00', '00')}>
            Thanh toán thành công
          </Button>
        </div>
      </section>
    </main>
  )
}
