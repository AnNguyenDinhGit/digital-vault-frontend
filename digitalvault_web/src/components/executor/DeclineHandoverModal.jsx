import { X, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { validateDeclineReason } from '../../utils/validators'
import TextField from '../common/TextField'

// Hộp thoại Executor từ chối tiếp nhận hồ sơ: lý do bắt buộc. onSubmit nhận lý do; lỗi ném ra đã là thông báo tiếng Việt.
export default function DeclineHandoverModal({ requestId, onClose, onSubmit }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const message = validateDeclineReason(reason)
    setError(message ?? '')
    if (message) return

    setBusy(true)
    try {
      await onSubmit(reason.trim())
    } catch (caught) {
      setBusy(false)
      setSubmitError(caught.message)
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="decline-handover-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <XCircle size={20} aria-hidden="true" />
          </span>
          <h2 id="decline-handover-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Từ Chối Tiếp Nhận Hồ Sơ
          </h2>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-3">
          <p className="mb-0 fs-13 text-slate-600">
            {`Bạn sắp từ chối hồ sơ #${requestId}. Phân công của bạn với kho này sẽ bị thu hồi, chủ kho nhận được lý do và có thể chọn người thi hành khác. Không thể đổi ý sau khi từ chối.`}
          </p>
          <TextField
            id="decline-reason"
            name="reason"
            label="Lý do từ chối"
            required
            as="textarea"
            rows={4}
            disabled={busy}
            inputClassName="av-textarea"
            placeholder="Ví dụ: Hiện tại tôi không thể tiếp nhận hồ sơ này"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError('')
            }}
            error={error}
          />
          {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
            Quay lại
          </Button>
          <Button type="submit" variant="danger" disabled={busy} className="av-btn av-btn-md">
            {busy ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
