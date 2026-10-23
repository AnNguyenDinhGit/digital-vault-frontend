import { UserCog, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { getExecutors } from '../../callapi/ownerApi'
import { MOCK_MODE } from '../../mocks/mode'
import { executorErrorMessage } from '../../utils/executor'
import TextField from '../common/TextField'

// Hộp thoại chọn Executor để ủy quyền cho một kho. Chỉ mount khi mở nên mỗi lần mở đều tải lại danh sách.
// BE thật trả danh sách Executor đủ điều kiện (chỉ có tên) và cho tìm theo tên; chế độ hỗn hợp nhập ID tài khoản Executor.
export default function ExecutorPickerModal({ vaultId, currentExecutorId, mockMode = MOCK_MODE, onConfirm, onClose }) {
  // Chế độ hỗn hợp vẫn nhập ID vì danh sách mô phỏng không khớp tài khoản thật; mock đầy đủ và BE thật đều có danh sách
  const manual = mockMode === 'hybrid'
  const [manualId, setManualId] = useState('')
  const [search, setSearch] = useState('')
  const [manualError, setManualError] = useState('')
  const [candidates, setCandidates] = useState({ status: 'loading', items: [], error: '' })
  const [selectedId, setSelectedId] = useState(currentExecutorId ?? null)
  const [submit, setSubmit] = useState({ busy: false, error: '' })

  useEffect(() => {
    if (manual) return undefined
    let cancelled = false
    // Chờ người dùng ngừng gõ rồi mới tìm để không gọi API sau mỗi phím
    const timer = setTimeout(() => {
      getExecutors({ search, vaultId })
        .then((items) => {
          if (!cancelled) setCandidates({ status: 'ready', items, error: '' })
        })
        .catch((error) => {
          if (!cancelled) setCandidates({ status: 'error', items: [], error: executorErrorMessage(error) })
        })
    }, search ? 300 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [manual, search, vaultId])

  const handleConfirm = async () => {
    let executorId = selectedId
    if (manual) {
      executorId = Number(manualId)
      if (!Number.isInteger(executorId) || executorId < 1) {
        setManualError('ID người thi hành phải là số nguyên dương.')
        return
      }
    }
    setSubmit({ busy: true, error: '' })
    try {
      await onConfirm(executorId)
    } catch (error) {
      setSubmit({ busy: false, error: executorErrorMessage(error) })
    }
  }

  const handleClose = () => {
    if (!submit.busy) onClose()
  }

  const unchanged = !manual && (selectedId === null || selectedId === currentExecutorId)

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="executor-picker-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <UserCog size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">DIGITAL EXECUTOR</span>
            <h2 id="executor-picker-title" className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Chọn Người Thi Hành
            </h2>
          </div>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="av-modal-body d-flex flex-column gap-3">
        <p className="mb-0 fs-13 text-slate-600">
          Executor là luật sư hoặc công chứng viên được bạn ủy quyền thực hiện bàn giao kho khi điều kiện kích hoạt xảy ra.
        </p>

        {manual && (
          <TextField
            id="executor-id"
            name="executorId"
            type="number"
            min="1"
            label="ID người thi hành"
            required
            disabled={submit.busy}
            value={manualId}
            onChange={(event) => {
              setManualId(event.target.value)
              setManualError('')
            }}
            error={manualError}
          />
        )}

        {!manual && candidates.status === 'loading' && (
          <p className="mb-0 d-flex align-items-center gap-2 fs-12 text-slate-500">
            <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
            Đang tải danh sách người thi hành...
          </p>
        )}
        {!manual && candidates.status === 'error' && <Alert variant="danger" className="av-alert mb-0">{candidates.error}</Alert>}

        {!manual && (
          <input
            type="search"
            className="form-control av-input"
            aria-label="Tìm người thi hành"
            placeholder="Tìm theo tên..."
            maxLength={100}
            value={search}
            disabled={submit.busy}
            onChange={(event) => setSearch(event.target.value)}
          />
        )}

        {!manual && candidates.status === 'ready' && candidates.items.length === 0 && <p className="av-empty mb-0">Không có người thi hành phù hợp.</p>}

        {!manual && candidates.status === 'ready' && (
          <div role="radiogroup" aria-label="Danh sách người thi hành" className="d-flex flex-column gap-2">
            {candidates.items.map((item) => (
              <label key={item.executorId} className="av-info-box d-flex align-items-start gap-3" style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="executorId"
                  className="mt-1"
                  checked={selectedId === item.executorId}
                  disabled={submit.busy}
                  onChange={() => setSelectedId(item.executorId)}
                />
                <span style={{ minWidth: 0 }}>
                  <span className="d-block fw-semibold text-ink">{item.fullName}</span>
                  {item.organization && <span className="d-block fs-12 text-slate-500">{item.organization}</span>}
                  {item.licenseNumber && <span className="d-block fs-11 text-slate-400">{`Thẻ LS: ${item.licenseNumber}`}</span>}
                </span>
              </label>
            ))}
          </div>
        )}

        {submit.error && <Alert variant="danger" className="av-alert mb-0">{submit.error}</Alert>}
      </div>

      <div className="av-modal-foot justify-content-end gap-2">
        <Button type="button" variant="light" onClick={handleClose} disabled={submit.busy} className="av-btn av-btn-md border">
          Hủy
        </Button>
        <Button type="button" variant="primary" onClick={handleConfirm} disabled={unchanged || submit.busy} className="av-btn av-btn-md">
          {submit.busy ? 'Đang xử lý dữ liệu...' : 'Xác nhận ủy quyền'}
        </Button>
      </div>
    </Modal>
  )
}
