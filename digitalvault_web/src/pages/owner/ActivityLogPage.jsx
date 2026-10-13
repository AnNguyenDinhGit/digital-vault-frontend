import { Download, History, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import MockNotice from '../../components/common/MockNotice'
import Pagination from '../../components/owner/Pagination'
import { useActivityLogs } from '../../hooks/useActivityLogs'
import { actionLabel, buildCsv, entityLabel, filterLogs, getActionOptions, resultInfo } from '../../utils/activityLog'
import { paginate } from '../../utils/catalog'
import { downloadTextFile } from '../../utils/download'
import { formatDateTime } from '../../utils/proofOfLife'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const EMPTY_FILTERS = { query: '', action: 'all', result: 'all', from: '', to: '' }
const BADGE_CLASS = { ok: 'av-badge-ok', warn: 'av-badge-warn', info: 'av-badge-info', muted: 'av-badge-muted' }

// Trang "Nhật ký hoạt động": lịch sử thao tác của Owner, có tìm kiếm, lọc, phân trang và xuất CSV
export default function ActivityLogPage() {
  const { status, error, logs, reload } = useActivityLogs()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => filterLogs(logs, filters), [logs, filters])
  const actionOptions = useMemo(() => getActionOptions(logs), [logs])
  const pageData = paginate(filtered, page, pageSize)
  const hasActiveFilter = Object.keys(EMPTY_FILTERS).some((key) => filters[key] !== EMPTY_FILTERS[key])

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  if (status === 'loading') {
    return (
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang tải nhật ký hoạt động...
      </p>
    )
  }

  if (status === 'error') {
    return (
      <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3">
        <span>{error}</span>
        <Button type="button" variant="light" size="sm" className="border" onClick={reload}>
          Thử lại
        </Button>
      </Alert>
    )
  }

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <History size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Nhật ký hoạt động
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Lịch sử thao tác và truy cập kho tài sản của bạn.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="light"
          className="av-btn av-btn-sm border"
          disabled={filtered.length === 0}
          onClick={() => downloadTextFile('nhat-ky-hoat-dong.csv', buildCsv(filtered), 'text/csv;charset=utf-8')}
        >
          <Download size={16} aria-hidden="true" />
          Xuất CSV
        </Button>
      </section>

      <MockNotice />

      <section className="av-panel d-flex flex-column gap-3" aria-label="Danh sách nhật ký">
        {logs.length === 0 ? (
          <p className="av-empty mb-0">Chưa có hoạt động nào được ghi nhận.</p>
        ) : (
          <>
            <div className="row g-2">
              <div className="col-12 col-lg-4 av-search">
                <Search size={16} className="av-field-icon" aria-hidden="true" style={{ left: 22 }} />
                <Form.Control
                  type="search"
                  aria-label="Tìm trong nhật ký"
                  placeholder="Tìm theo thao tác, đối tượng, địa chỉ IP..."
                  value={filters.query}
                  onChange={(event) => setFilter('query', event.target.value)}
                  className="av-input av-input-icon"
                />
              </div>
              <div className="col-6 col-lg-2">
                <Form.Select aria-label="Loại thao tác" value={filters.action} onChange={(event) => setFilter('action', event.target.value)}>
                  <option value="all">Tất cả thao tác</option>
                  {actionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-6 col-lg-2">
                <Form.Select aria-label="Kết quả" value={filters.result} onChange={(event) => setFilter('result', event.target.value)}>
                  <option value="all">Tất cả kết quả</option>
                  <option value="Success">Thành công</option>
                  <option value="Failed">Thất bại</option>
                </Form.Select>
              </div>
              <div className="col-6 col-lg-2">
                <Form.Control type="date" aria-label="Từ ngày" value={filters.from} onChange={(event) => setFilter('from', event.target.value)} />
              </div>
              <div className="col-6 col-lg-2">
                <Form.Control type="date" aria-label="Đến ngày" value={filters.to} onChange={(event) => setFilter('to', event.target.value)} />
              </div>
            </div>
            {hasActiveFilter && (
              <div>
                <button type="button" className="av-link-btn fs-12" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }}>
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {filtered.length === 0 ? (
              <p className="av-empty mb-0">Không có bản ghi phù hợp.</p>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0 fs-13" aria-label="Nhật ký hoạt động">
                  <thead>
                    <tr className="fs-11 text-slate-500">
                      <th scope="col">Thời gian</th>
                      <th scope="col">Thao tác</th>
                      <th scope="col">Đối tượng</th>
                      <th scope="col">Địa chỉ IP</th>
                      <th scope="col">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.items.map((log) => {
                      const result = resultInfo(log.result)
                      return (
                        <tr key={log.logId}>
                          <td className="text-nowrap">{formatDateTime(log.timestamp)}</td>
                          <td className="fw-semibold text-ink">{actionLabel(log.action)}</td>
                          <td>{entityLabel(log.entityType, log.entityId)}</td>
                          <td className="font-mono fs-12">{log.ipAddress}</td>
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

            {filtered.length > 0 && (
              <Pagination
                pageData={pageData}
                pageSize={pageSize}
                unit="bản ghi"
                perPageUnit="bản ghi"
                sizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setPage(1)
                }}
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}
