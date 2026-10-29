import { History, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { getAuditLogs } from '../../callapi/adminApi'
import AdminPager from '../../components/admin/AdminPager'
import MockNotice from '../../components/common/MockNotice'
import { useAdminList } from '../../hooks/useAdminList'
import { MOCK_MODE } from '../../mocks/mode'
import { actionLabel, entityLabel, KNOWN_ACTIONS, resultInfo } from '../../utils/activityLog'
import { formatDateTime } from '../../utils/proofOfLife'

const BADGE_CLASS = { ok: 'av-badge-ok', warn: 'av-badge-warn', info: 'av-badge-info', muted: 'av-badge-muted' }

// Danh sách mã thao tác cho ô lọc, sắp theo nhãn tiếng Việt
const ACTION_OPTIONS = KNOWN_ACTIONS.map((value) => ({ value, label: actionLabel(value) })).sort((a, b) => a.label.localeCompare(b.label, 'vi'))

// Trang "Nhật ký kiểm toán" của Admin: toàn bộ thao tác của mọi người dùng, mới nhất trước, lọc theo thao tác
export default function AdminAuditLogsPage({ mockMode = MOCK_MODE }) {
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const params = useMemo(() => ({ page, pageSize, action }), [page, pageSize, action])
  const { items: logs, error, loading, reload } = useAdminList(getAuditLogs, params)

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <History size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Nhật ký kiểm toán hệ thống
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Mọi thao tác của người dùng và quản trị viên, mới nhất trước.</p>
          </div>
        </div>
        <Button type="button" variant="light" className="av-btn av-btn-sm border" disabled={loading} onClick={reload}>
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </Button>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      <section className="av-panel d-flex flex-column gap-3" aria-label="Nhật ký kiểm toán">
        <div className="row g-2">
          <div className="col-12 col-lg-4">
            <Form.Select
              aria-label="Lọc theo thao tác"
              value={action}
              onChange={(event) => {
                setAction(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả thao tác</option>
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </div>
        </div>

        {error ? (
          <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3 mb-0">
            <span>{error}</span>
            <Button type="button" variant="light" size="sm" className="border" onClick={reload}>
              Thử lại
            </Button>
          </Alert>
        ) : loading && logs.length === 0 ? (
          <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500 mb-0">
            <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
            Đang tải nhật ký kiểm toán...
          </p>
        ) : logs.length === 0 ? (
          <p className="av-empty mb-0">Không có bản ghi phù hợp.</p>
        ) : (
          <div className="table-responsive" aria-busy={loading}>
            <table className="table align-middle mb-0 fs-13" aria-label="Nhật ký kiểm toán">
              <thead>
                <tr className="fs-11 text-slate-500">
                  <th scope="col">Thời gian</th>
                  <th scope="col">Người thực hiện</th>
                  <th scope="col">Thao tác</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">Địa chỉ IP</th>
                  <th scope="col">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const result = resultInfo(log.result)
                  return (
                    <tr key={log.logId}>
                      <td className="text-nowrap">{formatDateTime(log.timestamp)}</td>
                      <td>{log.userEmail ?? 'Hệ thống'}</td>
                      <td className="fw-semibold text-ink">{actionLabel(log.action)}</td>
                      <td>{entityLabel(log.entityType, log.entityId)}</td>
                      <td className="font-mono fs-12">{log.ipaddress ?? '—'}</td>
                      <td>
                        <span className={`av-badge ${BADGE_CLASS[result.tone]}`}>{result.text}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!error && logs.length > 0 && (
          <AdminPager
            page={page}
            pageSize={pageSize}
            count={logs.length}
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
