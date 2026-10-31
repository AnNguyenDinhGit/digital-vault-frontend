import { RefreshCw, Workflow } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { getHandoverOverview } from '../../callapi/adminApi'
import AdminPager from '../../components/admin/AdminPager'
import HandoverStatusBadge from '../../components/executor/HandoverStatusBadge'
import { useAdminList } from '../../hooks/useAdminList'
import { vaultLabel } from '../../utils/executor'
import { handoverCode, handoverStatusInfo } from '../../utils/handover'
import { formatDateTime } from '../../utils/proofOfLife'

// Trạng thái hồ sơ để lọc, theo thứ tự của quy trình
const STATUS_OPTIONS = [
  'Pending_Executor',
  'Declined',
  'Draft',
  'Pending_Legal',
  'Additional_Info',
  'Rejected',
  'Approved',
  'In_Progress',
  'Completed',
  'Cancelled',
].map((value) => ({ value, label: handoverStatusInfo(value).text }))

// Gọi API xem hồ sơ toàn hệ thống (GET /admin/handovers). 404 hoặc 405 nghĩa là BE chưa có endpoint này, 403 là chưa cấp quyền Admin
async function fetchOverview(params) {
  try {
    return await getHandoverOverview(params)
  } catch (error) {
    if (error?.status === 404 || error?.status === 405) {
      throw new Error('Máy chủ chưa có API danh sách hồ sơ bàn giao dành cho Admin (GET /api/admin/handovers). Trang sẽ tự hiển thị khi máy chủ bổ sung.', { cause: error })
    }
    if (error?.status === 403) throw new Error('Tài khoản Admin chưa được phép xem danh sách hồ sơ bàn giao toàn hệ thống (máy chủ trả 403).', { cause: error })
    throw error
  }
}

// Trang "Quy trình bàn giao" của Admin: toàn bộ hồ sơ bàn giao trong hệ thống, lọc theo trạng thái và chủ kho
export default function AdminHandoversPage() {
  const [status, setStatus] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // ID chủ kho chỉ gửi lên khi là số nguyên dương
  const ownerFilter = /^[1-9]\d*$/.test(ownerId.trim()) ? ownerId.trim() : ''
  const params = useMemo(() => ({ page, pageSize, status, ownerId: ownerFilter }), [page, pageSize, status, ownerFilter])
  const { items: handovers, error, loading, reload } = useAdminList(fetchOverview, params)

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <Workflow size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Quy trình bàn giao
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Toàn bộ hồ sơ bàn giao di sản trong hệ thống, từ lúc tạo đến khi hoàn tất.</p>
          </div>
        </div>
        <Button type="button" variant="light" className="av-btn av-btn-sm border" disabled={loading} onClick={reload}>
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </Button>
      </section>

      <section className="av-panel d-flex flex-column gap-3" aria-label="Hồ sơ bàn giao toàn hệ thống">
        <div className="row g-2">
          <div className="col-12 col-md-5 col-lg-4">
            <Form.Select
              aria-label="Lọc theo trạng thái"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </div>
          <div className="col-12 col-md-5 col-lg-3">
            <Form.Control
              type="text"
              inputMode="numeric"
              aria-label="Lọc theo ID chủ kho"
              placeholder="ID chủ kho (không bắt buộc)"
              value={ownerId}
              onChange={(event) => {
                setOwnerId(event.target.value)
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
        ) : loading && handovers.length === 0 ? (
          <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500 mb-0">
            <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
            Đang tải danh sách hồ sơ bàn giao...
          </p>
        ) : handovers.length === 0 ? (
          <p className="av-empty mb-0">Không có hồ sơ bàn giao phù hợp.</p>
        ) : (
          <div className="table-responsive" aria-busy={loading}>
            <table className="table align-middle mb-0 fs-13" aria-label="Danh sách hồ sơ bàn giao">
              <thead>
                <tr className="fs-11 text-slate-500">
                  <th scope="col">Mã hồ sơ</th>
                  <th scope="col">Kho</th>
                  <th scope="col">Chủ kho</th>
                  <th scope="col">Người thi hành</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Hoàn tất</th>
                </tr>
              </thead>
              <tbody>
                {handovers.map((item) => (
                  <tr key={item.requestId}>
                    <td className="fw-semibold text-ink text-nowrap">{handoverCode(item)}</td>
                    <td>{vaultLabel(item.vaultId, item.vaultName)}</td>
                    <td>{item.owner?.fullName ?? '—'}</td>
                    <td>{item.executorName ?? (item.executorId ? `Executor #${item.executorId}` : '—')}</td>
                    <td>
                      <HandoverStatusBadge status={item.status} />
                    </td>
                    <td className="text-nowrap">{formatDateTime(item.initiatedAt)}</td>
                    <td className="text-nowrap">{item.completedAt ? formatDateTime(item.completedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && handovers.length > 0 && (
          <AdminPager
            page={page}
            pageSize={pageSize}
            count={handovers.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        )}
      </section>
    </div>
  )
}
