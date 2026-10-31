import { ChevronLeft, ChevronRight, Receipt, RefreshCw } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { getMyTransactions } from '../../callapi/paymentApi'
import { useAdminResource } from '../../hooks/useAdminResource'
import AdminResourceState from '../admin/AdminResourceState'
import { redirectTo } from '../../utils/navigation'
import {
  formatPaymentDateTime,
  formatVnd,
  getPendingCheckoutByCode,
  getPendingCheckoutByPlan,
  isPendingExpired,
  PAYMENT_STATUS_FILTERS,
  paymentStatusInfo,
} from '../../utils/payment'

const PAGE_SIZE = 10
const FETCH_LIMIT = 100

// BE chỉ trả planName trong giao dịch nên tìm planId theo tên gói để mở lại màn hình thanh toán
function planIdOf(plans, planName) {
  return plans.find((plan) => plan.planName === planName)?.planId ?? null
}

// Chỉ giữ lại tối đa 1 giao dịch Pending mới nhất (nếu chưa có giao dịch Success nào mới hơn); ẩn toàn bộ các dòng Pending cũ bị trùng
function deduplicatePending(items) {
  let keptPending = false
  let seenSuccess = false
  return items.filter((item) => {
    if (item.status === 'Success') {
      seenSuccess = true
      return true
    }
    if (item.status !== 'Pending') return true
    if (keptPending || seenSuccess) return false
    keptPending = true
    return true
  })
}

// Thao tác cho giao dịch đang chờ: nếu còn lưu paymentUrl của đúng mã giao dịch hoặc gói thì mở lại ngay link đó (không sinh đơn Pending mới)
function PendingAction({ item, plans }) {
  const expired = isPendingExpired(item)
  const planId = planIdOf(plans, item.planName)
  const saved = !expired ? (getPendingCheckoutByCode(item.transactionCode) ?? (planId ? getPendingCheckoutByPlan(planId) : null)) : null
  if (saved?.paymentUrl) {
    return (
      <Button type="button" size="sm" variant="primary" className="av-btn av-btn-sm text-nowrap" onClick={() => redirectTo(saved.paymentUrl)}>
        Tiếp tục thanh toán
      </Button>
    )
  }
  if (!planId) return <span className="fs-12 text-slate-400">—</span>
  return (
    <Button as={Link} to={`/owner/plans/${planId}/checkout`} size="sm" variant={expired ? 'light' : 'primary'} className={`av-btn av-btn-sm text-nowrap${expired ? ' border' : ''}`}>
      {expired ? 'Thanh toán lại' : 'Tiếp tục thanh toán'}
    </Button>
  )
}

// Lịch sử giao dịch của người dùng (GET /payments/me/transactions): gộp toàn bộ các dòng Pending trùng trước khi phân trang để không bị lệch số trang
export default function PaymentHistoryPanel({ plans = [] }) {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const fetcher = useCallback(() => getMyTransactions({ page: 1, pageSize: FETCH_LIMIT, status }), [status])
  const { data, error, loading, reload } = useAdminResource(fetcher)
  const allItems = deduplicatePending(data?.items ?? [])
  const total = allItems.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const items = allItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const hasPending = items.some((item) => item.status === 'Pending')

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
        <div className="d-flex align-items-center gap-2">
          <Button type="button" variant="light" size="sm" className="border d-flex align-items-center gap-1" disabled={loading} onClick={reload}>
            <RefreshCw size={14} aria-hidden="true" />
            Làm mới
          </Button>
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
      </div>

      <AdminResourceState error={error} loading={loading} hasData={Boolean(data)} loadingText="Đang tải lịch sử thanh toán..." onRetry={reload} />

      {data && items.length === 0 && (
        <p className="av-empty mb-0">{status ? 'Không có giao dịch nào ở trạng thái này.' : 'Bạn chưa có giao dịch thanh toán nào.'}</p>
      )}

      {hasPending && (
        <p role="note" className="mb-0 fs-12 text-slate-500">
          Giao dịch <strong>Đang chờ xác nhận</strong> là giao dịch đã tạo nhưng chưa nhận được kết quả từ VNPay (chưa thanh toán xong hoặc đã đóng trang VNPay).
          Bạn không bị trừ tiền cho các giao dịch này.
        </p>
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
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const expired = isPendingExpired(item)
                const info = expired ? { text: 'Quá hạn thanh toán', tone: 'muted' } : paymentStatusInfo(item.status)
                return (
                  <tr key={item.transactionId ?? item.transactionCode}>
                    <td className="text-nowrap">{formatPaymentDateTime(item.createdAt)}</td>
                    <td className="font-mono fs-12 text-break">{item.transactionCode}</td>
                    <td className="fw-semibold text-ink">{item.planName ?? '—'}</td>
                    <td className="text-nowrap">{formatVnd(item.amount)}</td>
                    <td>{item.paymentMethod === 'Free' || Number(item.amount) === 0 ? 'Miễn phí' : (item.paymentMethod ?? 'VNPay')}</td>
                    <td>
                      <span className={`av-badge av-badge-${info.tone}`}>{info.text}</span>
                    </td>
                    <td>
                      {item.status === 'Pending' ? (
                        <PendingAction item={item} plans={plans} />
                      ) : (
                        <span className="fs-12 text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && total > PAGE_SIZE && (
        <nav className="d-flex align-items-center justify-content-end gap-2 fs-13" aria-label="Phân trang lịch sử thanh toán">
          <Button type="button" variant="light" size="sm" className="border" disabled={loading || safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label="Trang trước">
            <ChevronLeft size={14} aria-hidden="true" />
          </Button>
          <span className="text-slate-600">{`Trang ${safePage} / ${totalPages}`}</span>
          <Button type="button" variant="light" size="sm" className="border" disabled={loading || safePage >= totalPages} onClick={() => setPage(safePage + 1)} aria-label="Trang sau">
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
        </nav>
      )}
    </section>
  )
}
