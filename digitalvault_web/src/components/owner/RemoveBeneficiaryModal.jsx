import { Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { removeBeneficiary } from '../../callapi/ownerApi'
import { formatAllocation } from '../../utils/catalog'
import { ownerMutationErrorMessage } from '../../utils/ownerErrors'

// Modal xác nhận gỡ một người thụ hưởng khỏi mọi tài sản họ đang hưởng. Chỉ mount khi mở.
// onRemoved: đã gỡ được ít nhất một tài sản (trang cần tải lại); onClose: đóng mà không đổi gì.
export default function RemoveBeneficiaryModal({ person, onClose, onRemoved }) {
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const removedAny = useRef(false)

  const handleClose = () => {
    if (busy) return
    if (removedAny.current) onRemoved()
    else onClose()
  }

  const handleConfirm = async () => {
    setBusy(true)
    setSubmitError('')
    let firstError = null
    for (const item of person.items) {
      try {
        await removeBeneficiary(item.assetId, person.beneficiaryId)
        removedAny.current = true
      } catch (error) {
        // 404 nghĩa là đã được gỡ từ trước nên coi như thành công
        if (error?.status === 404) removedAny.current = true
        else firstError ??= error
      }
    }
    if (!firstError) {
      onRemoved()
      return
    }
    setBusy(false)
    setSubmitError(ownerMutationErrorMessage(firstError))
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="remove-beneficiary-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <Trash2 size={20} aria-hidden="true" />
          </span>
          <h2 id="remove-beneficiary-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Xóa Người Thụ Hưởng
          </h2>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="av-modal-body d-flex flex-column gap-3">
        <p className="mb-0 fs-13 text-slate-600">
          {`Bạn sắp gỡ ${person.fullName} khỏi ${person.items.length} tài sản. Phần trăm họ đang hưởng sẽ trở thành chưa phân bổ và có thể chỉ định cho người khác.`}
        </p>
        <ul className="list-unstyled mb-0 d-flex flex-column gap-1" aria-label="Tài sản bị ảnh hưởng">
          {person.items.map((item) => (
            <li key={item.assetId} className="d-flex justify-content-between gap-3 fs-12 text-slate-600">
              <span className="text-truncate">{item.assetName}</span>
              <span className="fw-semibold text-ink">{formatAllocation(item.allocation)}</span>
            </li>
          ))}
        </ul>
        {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}
      </div>

      <div className="av-modal-foot justify-content-end gap-2">
        <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
          Hủy
        </Button>
        <Button type="button" variant="danger" onClick={handleConfirm} disabled={busy} className="av-btn av-btn-md">
          {busy ? 'Đang xử lý dữ liệu...' : 'Xác nhận xóa'}
        </Button>
      </div>
    </Modal>
  )
}
