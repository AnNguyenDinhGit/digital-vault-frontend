import { FileText } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { createHandover } from '../../callapi/executorApi'
import MockNotice from '../../components/common/MockNotice'
import HandoverTable from '../../components/executor/HandoverTable'
import { useExecutorPortal } from '../../hooks/useExecutorPortal'
import { MOCK_MODE } from '../../mocks/mode'
import { vaultLabel, vaultNamesOf } from '../../utils/executor'
import { createHandoverErrorMessage, filterHandovers } from '../../utils/handover'
import { formatDate } from '../../utils/proofOfLife'

const ASSIGNMENT_STATUS_LABELS = { Active: 'Đang hiệu lực', AutoAssigned: 'Phân công tự động' }

// Trang "Đơn bàn giao di sản" của Executor: kho được phân công (tạo hồ sơ Draft) và danh sách hồ sơ
export default function ExecutorOrdersPage({ mockMode = MOCK_MODE }) {
  const { status, error, assignments, handovers, reload } = useExecutorPortal()
  const navigate = useNavigate()
  const [creatingVaultId, setCreatingVaultId] = useState(null)
  const [createError, setCreateError] = useState('')

  const handleCreate = async (vaultId) => {
    setCreatingVaultId(vaultId)
    setCreateError('')
    try {
      const request = await createHandover(vaultId)
      navigate(`/executor/handovers/${request.requestId}`)
    } catch (caught) {
      setCreateError(createHandoverErrorMessage(caught))
      setCreatingVaultId(null)
    }
  }

  if (status === 'loading') {
    return (
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang tải đơn bàn giao...
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

  const openRequestOf = (vaultId) => handovers.find((item) => item.vaultId === vaultId && item.status !== 'Cancelled')

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <FileText size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Đơn bàn giao di sản
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Các kho bạn được ủy quyền và hồ sơ bàn giao đang xử lý.</p>
          </div>
        </div>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      <section className="av-panel d-flex flex-column gap-3" aria-label="Kho được phân công">
        <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
          Kho được phân công
        </h2>
        {createError && <Alert variant="danger" className="av-alert mb-0">{createError}</Alert>}
        {assignments.length === 0 ? (
          <p className="av-empty mb-0">Bạn chưa được phân công kho nào.</p>
        ) : (
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
            {assignments.map((assignment) => {
              const open = openRequestOf(assignment.vaultId)
              return (
                <li key={assignment.vaultId} className="av-doc-item">
                  <div className="av-doc-main">
                    <p className="mb-0 fs-13 fw-semibold text-ink">{vaultLabel(assignment.vaultId, assignment.vaultName)}</p>
                    {assignment.owner?.fullName && <p className="mb-0 fs-12 text-slate-600">{`Chủ kho: ${assignment.owner.fullName}`}</p>}
                    <p className="mb-0 fs-12 text-slate-500">
                      {`${ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status} · phân công ${formatDate(assignment.assignedAt)}`}
                    </p>
                  </div>
                  {open ? (
                    <Link to={`/executor/handovers/${open.requestId}`} className="av-ghost-btn is-brand">
                      Xem hồ sơ
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      className="av-btn av-btn-sm"
                      disabled={creatingVaultId !== null}
                      onClick={() => handleCreate(assignment.vaultId)}
                    >
                      {creatingVaultId === assignment.vaultId ? 'Đang tạo...' : 'Tạo hồ sơ bàn giao'}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="av-panel d-flex flex-column gap-3" aria-label="Hồ sơ bàn giao">
        <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
          Hồ sơ bàn giao
        </h2>
        {handovers.length === 0 ? <p className="av-empty mb-0">Chưa có hồ sơ bàn giao nào.</p> : <HandoverTable handovers={filterHandovers(handovers)} vaultNames={vaultNamesOf(assignments)} />}
      </section>
    </div>
  )
}
