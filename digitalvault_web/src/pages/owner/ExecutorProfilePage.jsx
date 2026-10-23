import { UserCog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useParams, useSearchParams } from 'react-router-dom'
import { getExecutorDetail } from '../../callapi/ownerApi'
import { executorBadgeClass, executorStatusLabel } from '../../utils/executor'
import { formatDate } from '../../utils/proofOfLife'
import { ROLE_LABELS } from '../../utils/admin'

const FIELDS = (detail) => [
  ['Họ và tên', detail.fullName || '—'],
  ['Vai trò', ROLE_LABELS[detail.role] ?? detail.role ?? '—'],
  ['Tham gia từ', detail.joinedAt ? formatDate(detail.joinedAt) : '—'],
]

// Trang chi tiết một Executor, mở ở cửa sổ mới từ danh sách chọn người thi hành (không có sidebar)
export default function ExecutorProfilePage() {
  const { executorId } = useParams()
  const [searchParams] = useSearchParams()
  const vaultId = searchParams.get('vaultId')
  const [reloadKey, setReloadKey] = useState(0)
  // Kết quả gắn với khoá của lần tải; khoá khác khoá hiện tại nghĩa là đang tải
  const [stored, setStored] = useState({ key: null })
  const key = `${executorId}:${vaultId}:${reloadKey}`
  const state = stored.key === key ? stored : { status: 'loading', data: null, error: '' }

  useEffect(() => {
    let cancelled = false
    getExecutorDetail(executorId, vaultId)
      .then((data) => {
        if (!cancelled) setStored({ key, status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (cancelled) return
        const message = error?.status === 404 ? 'Không tìm thấy người thi hành này.' : error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
        setStored({ key, status: 'error', data: null, error: message })
      })
    return () => {
      cancelled = true
    }
  }, [executorId, vaultId, key])

  return (
    <div className="av-center-screen">
      <div className="av-panel w-100" style={{ maxWidth: 480 }}>
        <div className="d-flex align-items-center gap-3 mb-4">
          <span className="av-icon-tile">
            <UserCog size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">DIGITAL EXECUTOR</span>
            <h1 className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19 }}>Thông tin người thi hành</h1>
          </div>
        </div>

        {state.status === 'loading' && (
          <p role="status" className="mb-0 d-flex align-items-center gap-2 fs-13 text-slate-500">
            <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
            Đang tải thông tin...
          </p>
        )}

        {state.status === 'error' && (
          <div className="d-flex flex-column gap-3">
            <p role="alert" className="av-alert alert mb-0">{state.error}</p>
            <Button type="button" variant="light" className="av-btn av-btn-sm border" onClick={() => setReloadKey((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        )}

        {state.status === 'ready' && (
          <dl className="mb-0 d-flex flex-column gap-3">
            {FIELDS(state.data).map(([label, value]) => (
              <div key={label}>
                <dt className="av-stat-label">{label.toUpperCase()}</dt>
                <dd className="mb-0 fs-14 text-ink">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="av-stat-label">TRẠNG THÁI</dt>
              <dd className="mb-0">
                <span className={`av-badge ${executorBadgeClass(state.data.status)}`}>{executorStatusLabel(state.data.status)}</span>
              </dd>
            </div>
          </dl>
        )}

        <div className="mt-4 text-end">
          <Button type="button" variant="light" className="av-btn av-btn-sm border" onClick={() => window.close()}>
            Đóng cửa sổ
          </Button>
        </div>
      </div>
    </div>
  )
}
