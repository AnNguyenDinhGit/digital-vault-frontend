import { ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { closeVault } from '../../callapi/ownerApi'
import { ownerMutationErrorMessage } from '../../utils/ownerErrors'

// Hộp thoại xác nhận đóng kho; BE không có thao tác mở lại nên cảnh báo rõ trước khi đóng
export default function CloseVaultModal({ vault, onClose, onClosed }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleConfirm = async () => {
    setBusy(true)
    setError('')
    try {
      await closeVault(vault.vaultId)
      onClosed()
    } catch (caught) {
      setBusy(false)
      setError(ownerMutationErrorMessage(caught))
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="close-vault-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>
          <h2 id="close-vault-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Đóng Kho
          </h2>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="av-modal-body d-flex flex-column gap-3">
        <p className="mb-0 fs-13 text-slate-600">
          {`Bạn sắp đóng kho "${vault.name}". Sau khi đóng, bạn không thể thêm hay sửa tài sản, phân bổ và giấy tờ trong kho này, và hệ thống không thể mở lại kho.`}
        </p>
        {error && <Alert variant="danger" className="av-alert mb-0">{error}</Alert>}
      </div>

      <div className="av-modal-foot justify-content-end gap-2">
        <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
          Quay lại
        </Button>
        <Button type="button" variant="danger" onClick={handleConfirm} disabled={busy} className="av-btn av-btn-md">
          {busy ? 'Đang xử lý...' : 'Xác nhận đóng kho'}
        </Button>
      </div>
    </Modal>
  )
}
