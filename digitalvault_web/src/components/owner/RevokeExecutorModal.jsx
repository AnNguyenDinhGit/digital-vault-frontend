import { ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { revokeExecutorErrorMessage } from '../../utils/executor'

// Hộp thoại xác nhận thu hồi ủy quyền; chỉ mount khi mở
export default function RevokeExecutorModal({ executor, onConfirm, onClose }) {
  const [submit, setSubmit] = useState({ busy: false, error: '' })

  const handleConfirm = async () => {
    setSubmit({ busy: true, error: '' })
    try {
      await onConfirm()
    } catch (error) {
      setSubmit({ busy: false, error: revokeExecutorErrorMessage(error) })
    }
  }

  const handleClose = () => {
    if (!submit.busy) onClose()
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="executor-revoke-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>
          <h2 id="executor-revoke-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Thu Hồi Ủy Quyền Người Thi Hành
          </h2>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="av-modal-body d-flex flex-column gap-3">
        <p className="mb-0 fs-13 text-slate-600">
          {`Bạn sắp thu hồi ủy quyền của ${executor.fullName}${executor.organization ? ` (${executor.organization})` : ''}.${executor.contractNumber ? ` Hợp đồng ${executor.contractNumber} sẽ chấm dứt.` : ''} Kho này tạm thời không có người thi hành; hồ sơ bàn giao đang chờ Executor tiếp nhận (nếu có) sẽ bị hủy. Sau khi Executor đã tiếp nhận hồ sơ thì không thu hồi được.`}
        </p>
        {submit.error && <Alert variant="danger" className="av-alert mb-0">{submit.error}</Alert>}
      </div>

      <div className="av-modal-foot justify-content-end gap-2">
        <Button type="button" variant="light" onClick={handleClose} disabled={submit.busy} className="av-btn av-btn-md border">
          Hủy
        </Button>
        <Button type="button" variant="danger" onClick={handleConfirm} disabled={submit.busy} className="av-btn av-btn-md">
          {submit.busy ? 'Đang xử lý dữ liệu...' : 'Thu hồi'}
        </Button>
      </div>
    </Modal>
  )
}
