import { Receipt, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { getPaymentTransaction, getPaymentTransactions } from '../../callapi/adminApi'
import { useAdminList } from '../../hooks/useAdminList'
import { useAdminResource } from '../../hooks/useAdminResource'
import { ADMIN_PAYMENT_STATUSES, formatVnd, paymentStatusInfo } from '../../utils/payment'
import { formatDateTime } from '../../utils/proofOfLife'
import AdminPager from './AdminPager'
import AdminResourceState from './AdminResourceState'

const BADGE_CLASS = { ok: 'av-badge-ok', warn: 'av-badge-warn', caution: 'av-badge-caution', muted: 'av-badge-muted' }

function StatusBadge({ status }) {
  const info = paymentStatusInfo(status)
  return <span className={`av-badge ${BADGE_CLASS[info.tone]}`}>{info.text}</span>
}

// Hộp thoại chi tiết một giao dịch (kèm người thanh toán, chỉ có ở API chi tiết)
function TransactionDetailModal({ transactionId, onClose }) {
  const fetcher = useMemo(() => () => getPaymentTransaction(transactionId), [transactionId])
  const { data, error, loading, reload } = useAdminResource(fetcher)
  const rows = data
    ? [
        ['Mã giao dịch', data.transactionCode ?? `#${data.transactionId}`],
        ['Người thanh toán', data.userEmail ?? '—'],
        ['Gói', data.planName ?? '—'],
        ['Số tiền', formatVnd(data.amount)],
        ['Phương thức', data.paymentMethod ?? '—'],
        ['Thời gian', formatDateTime(data.createdAt)],
      ]
    : []

  return (
    <Modal show onHide={onClose} centered animation={false} dialogClassName="av-modal av-modal-sm" aria-labelledby="transaction-detail-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <Receipt size={20} aria-hidden="true" />
          </span>
          <h2 id="transaction-detail-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Chi Tiết Giao Dịch
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>
      <div className="av-modal-body d-flex flex-column gap-3">
        <AdminResourceState error={error} loading={loading} hasData={Boolean(data)} loadingText="Đang tải chi tiết giao dịch..." onRetry={reload} />
        {data && (
          <dl className="mb-0 d-flex flex-column gap-3">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="av-stat-label">{label.toUpperCase()}</dt>
                <dd className="mb-0 fs-14 text-ink">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="av-stat-label">TRẠNG THÁI</dt>
              <dd className="mb-0">
                <StatusBadge status={data.status} />
              </dd>
            </div>
          </dl>
        )}
      </div>
      <div className="av-modal-foot justify-content-end">
        <Button type="button" variant="light" onClick={onClose} className="av-btn av-btn-md border">
          Đóng
        </Button>
      </div>
    </Modal>
  )
}

// Danh sách giao dịch thanh toán của mọi người dùng, lọc theo trạng thái và ID người dùng
export default function PaymentTransactionsPanel() {
  const [status, setStatus] = useState('')
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [detailId, setDetailId] = useState(null)

  // ID người dùng chỉ gửi lên khi là số nguyên dương
  const userFilter = /^[1-9]\d*$/.test(userId.trim()) ? userId.trim() : ''
  const params = useMemo(() => ({ page, pageSize, status, userId: userFilter }), [page, pageSize, status, userFilter])
  const { items: transactions, error, loading, reload } = useAdminList(getPaymentTransactions, params)

  return (
    <div className="d-flex flex-column gap-3">
      <div className="row g-2">
        <div className="col-12 col-md-5 col-lg-4">
          <Form.Select
            aria-label="Lọc theo trạng thái giao dịch"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {ADMIN_PAYMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {paymentStatusInfo(value).text}
              </option>
            ))}
          </Form.Select>
        </div>
        <div className="col-12 col-md-5 col-lg-3">
          <Form.Control
            type="text"
            inputMode="numeric"
            aria-label="Lọc theo ID người dùng"
            placeholder="ID người dùng (không bắt buộc)"
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {error ? (
        <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3 mb-0">
          <span>{error}</span>
          <Button type="button" variant="light" size="sm" className="border" onClick={reload}>
            Thử lại
          </Button>
        </Alert>
      ) : loading && transactions.length === 0 ? (
        <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500 mb-0">
          <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
          Đang tải giao dịch thanh toán...
        </p>
      ) : transactions.length === 0 ? (
        <p className="av-empty mb-0">Chưa có giao dịch phù hợp.</p>
      ) : (
        <div className="table-responsive" aria-busy={loading}>
          <table className="table align-middle mb-0 fs-13" aria-label="Giao dịch thanh toán">
            <thead>
              <tr className="fs-11 text-slate-500">
                <th scope="col">Mã giao dịch</th>
                <th scope="col">Gói</th>
                <th scope="col">Số tiền</th>
                <th scope="col">Phương thức</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thời gian</th>
                <th scope="col" className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((item) => (
                <tr key={item.transactionId}>
                  <td className="font-mono fs-12">{item.transactionCode ?? `#${item.transactionId}`}</td>
                  <td>{item.planName ?? '—'}</td>
                  <td className="text-nowrap fw-semibold text-ink">{formatVnd(item.amount)}</td>
                  <td>{item.paymentMethod ?? '—'}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="text-nowrap">{formatDateTime(item.createdAt)}</td>
                  <td className="text-end">
                    <button type="button" className="av-ghost-btn" aria-label={`Xem chi tiết giao dịch ${item.transactionCode ?? item.transactionId}`} onClick={() => setDetailId(item.transactionId)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && transactions.length > 0 && (
        <AdminPager
          page={page}
          pageSize={pageSize}
          count={transactions.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}

      {detailId !== null && <TransactionDetailModal transactionId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
