import { Alert, Button } from 'react-bootstrap'
import HandoverTable from '../../components/executor/HandoverTable'
import { useExecutorPortal } from '../../hooks/useExecutorPortal'
import { filterHandovers } from '../../utils/handover'

// Danh sách hồ sơ bàn giao lọc theo nhóm trạng thái (chờ thẩm định, đã duyệt, đang bàn giao, lịch sử)
export default function ExecutorHandoverListPage({ title, description, statuses, emptyMessage }) {
  const { status, error, handovers, reload } = useExecutorPortal()

  if (status === 'loading') {
    return (
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang tải hồ sơ...
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

  const items = filterHandovers(handovers, statuses)

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div>
          <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <p className="mb-0 fs-12 text-slate-500">{description}</p>
        </div>
      </section>

      <section className="av-panel" aria-label={title}>
        {items.length === 0 ? <p className="av-empty mb-0">{emptyMessage}</p> : <HandoverTable handovers={items} />}
      </section>
    </div>
  )
}
