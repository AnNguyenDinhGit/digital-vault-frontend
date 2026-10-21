import { ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { revokeDocument } from '../../callapi/ownerApi'
import { ownerMutationErrorMessage } from '../../utils/ownerErrors'

// Hộp thoại xác nhận thu hồi một giấy tờ của tài sản; chỉ mount khi mở
export default function RevokeDocumentModal({ assetId, document, onClose, onRevoked }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleConfirm = async () => {
    setBusy(true)
    setError('')
    try {
      await revokeDocument(assetId, document.documentId)
      onRevoked()
    } catch (caught) {
      setBusy(false)
      setError(caught?.status === 409 && /already revoked/i.test(caught.message ?? '') ? 'Giấy tờ này đã được thu hồi trước đó.' : ownerMutationErrorMessage(caught))
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="revoke-document-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>
          <h2 id="revoke-document-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Thu Hồi Giấy Tờ
          </h2>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="av-modal-body d-flex flex-column gap-3">
        <p className="mb-0 fs-13 text-slate-600">
          {`Bạn sắp thu hồi giấy tờ "${document.fileName}". Giấy tờ sẽ không còn hiển thị trong tài sản và không thể khôi phục; nếu cần, bạn phải tải lên lại.`}
        </p>
        {error && <Alert variant="danger" className="av-alert mb-0">{error}</Alert>}
      </div>

      <div className="av-modal-foot justify-content-end gap-2">
        <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
          Quay lại
        </Button>
        <Button type="button" variant="danger" onClick={handleConfirm} disabled={busy} className="av-btn av-btn-md">
          {busy ? 'Đang xử lý...' : 'Xác nhận thu hồi'}
        </Button>
      </div>
    </Modal>
  )
}
