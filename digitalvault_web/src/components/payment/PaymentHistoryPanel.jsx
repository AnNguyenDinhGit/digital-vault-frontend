import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { getMyTransactions } from '../../callapi/paymentApi'
import { useAdminResource } from '../../hooks/useAdminResource'
import AdminResourceState from '../admin/AdminResourceState'
import { formatPaymentDateTime, formatVnd, PAYMENT_STATUS_FILTERS, paymentStatusInfo } from '../../utils/payment'

const PAGE_SIZE = 10

// Lịch sử giao dịch của người dùng (GET /payments/me/transactions): lọc theo trạng thái, phân trang theo tổng BE trả về
export default function PaymentHistoryPanel() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const fetcher = useCallback(() => getMyTransactions({ page, pageSize: PAGE_SIZE, status }), [page, status])
  const { data, error, loading, reload } = useAdminResource(fetcher)
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const items = data?.items ?? []

  const changeStatus = (value) => {
    setStatus(value)
    setPage(1)
  }

  return (
    <section className="av-panel d-flex flex-column gap-3" aria-labelledby="payment-history-title">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <h2 id="payment-history-title" className="mb-0 d-flex align-items-center gap-2 fw-bold text-ink" style={{ fontSize: 16 }}>
          <Receipt size={18} aria-hidden="true" className="text-brand" />
          Lịch sử thanh toán
        </h2>
        <Form.Select
          aria-label="Lọc theo trạng thái giao dịch"
          size="sm"
          style={{ width: 180 }}
          value={status}
          onChange={(event) => changeStatus(event.target.value)}
        >
          {PAYMENT_STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Form.Select>
      </div>

      <AdminResourceState error={error} loading={loading} hasData={Boolean(data)} loadingText="Đang tải lịch sử thanh toán..." onRetry={reload} />

      {data && items.length === 0 && (
        <p className="av-empty mb-0">{status ? 'Không có giao dịch nào ở trạng thái này.' : 'Bạn chưa có giao dịch thanh toán nào.'}</p>
      )}

      {items.length > 0 && (
        <div className="table-responsive" aria-busy={loading}>
          <table className="table align-middle mb-0 fs-13" aria-label="Lịch sử thanh toán">
            <thead>
              <tr className="fs-11 text-slate-500">
                <th scope="col">Thời gian</th>
                <th scope="col">Mã giao dịch</th>
                <th scope="col">Gói</th>
                <th scope="col">Số tiền</th>
                <th scope="col">Phương thức</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const info = paymentStatusInfo(item.status)
                return (
                  <tr key={item.transactionId ?? item.transactionCode}>
                    <td className="text-nowrap">{formatPaymentDateTime(item.createdAt)}</td>
                    <td className="font-mono fs-12 text-break">{item.transactionCode}</td>
                    <td className="fw-semibold text-ink">{item.planName ?? '—'}</td>
                    <td className="text-nowrap">{formatVnd(item.amount)}</td>
                    <td>{item.paymentMethod ?? 'VNPay'}</td>
                    <td>
                      <span className={`av-badge av-badge-${info.tone}`}>{info.text}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <nav className="d-flex align-items-center justify-content-end gap-2 fs-13" aria-label="Phân trang lịch sử thanh toán">
          <Button type="button" variant="light" size="sm" className="border" disabled={loading || page <= 1} onClick={() => setPage(page - 1)} aria-label="Trang trước">
            <ChevronLeft size={14} aria-hidden="true" />
          </Button>
          <span className="text-slate-600">{`Trang ${page} / ${totalPages}`}</span>
          <Button type="button" variant="light" size="sm" className="border" disabled={loading || page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Trang sau">
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
        </nav>
      )}
    </section>
  )
}

