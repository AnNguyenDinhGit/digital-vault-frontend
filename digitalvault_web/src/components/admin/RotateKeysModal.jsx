import { KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { rotateEncryptionKeys } from '../../callapi/adminApi'

// Hộp thoại xác nhận xoay vòng khóa: thao tác tăng phiên bản của mọi khóa đang hoạt động nên phải xác nhận trước khi gọi API
export default function RotateKeysModal({ activeKeys, onClose, onRotated }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleConfirm = async () => {
    setBusy(true)
    setError('')
    try {
      onRotated(await rotateEncryptionKeys())
    } catch (caught) {
      setBusy(false)
      setError(caught?.status === 403 ? 'Bạn không có quyền Quản trị hệ thống.' : caught?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.')
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="rotate-keys-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <h2 id="rotate-keys-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Xoay vòng khóa mã hóa
          </h2>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="av-modal-body d-flex flex-column gap-3">
        <p className="mb-0 fs-14 text-slate-600">
          {`Hệ thống sẽ tăng phiên bản (+1) và ghi nhận thời điểm xoay cho ${activeKeys} khóa mã hóa đang hoạt động. Thao tác này được ghi vào nhật ký kiểm toán và không thể hoàn tác.`}
        </p>
        {error && <Alert variant="danger" className="av-alert mb-0">{error}</Alert>}
      </div>

      <div className="av-modal-foot justify-content-end gap-2">
        <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
          Hủy
        </Button>
        <Button type="button" variant="primary" onClick={handleConfirm} disabled={busy} className="av-btn av-btn-md">
          {busy ? 'Đang xoay khóa...' : 'Xác nhận xoay khóa'}
        </Button>
      </div>
    </Modal>
  )
}
