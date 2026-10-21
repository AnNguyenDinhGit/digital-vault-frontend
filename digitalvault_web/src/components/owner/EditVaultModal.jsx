import { Vault, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { updateVault } from '../../callapi/ownerApi'
import { ownerMutationErrorMessage } from '../../utils/ownerErrors'
import { validateVault } from '../../utils/validators'
import TextField from '../common/TextField'

// Hộp thoại sửa tên và mô tả kho; chỉ mount khi mở nên form luôn lấy giá trị hiện tại của kho
export default function EditVaultModal({ vault, onClose, onSaved }) {
  const [form, setForm] = useState({ name: vault.name, description: vault.description ?? '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateVault(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      onSaved(await updateVault(vault.vaultId, form))
    } catch (caught) {
      setBusy(false)
      setSubmitError(caught?.status === 400 ? 'Thông tin kho không hợp lệ. Vui lòng kiểm tra lại.' : ownerMutationErrorMessage(caught))
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="edit-vault-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <Vault size={20} aria-hidden="true" />
          </span>
          <h2 id="edit-vault-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Sửa Thông Tin Kho
          </h2>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-4">
          <TextField id="edit-vault-name" name="name" label="Tên kho" required value={form.name} onChange={handleChange} error={errors.name} />
          <TextField
            id="edit-vault-description"
            name="description"
            label="Mô tả"
            as="textarea"
            rows={3}
            value={form.description}
            onChange={handleChange}
            inputClassName="av-textarea"
            error={errors.description}
          />
          {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={busy} className="av-btn av-btn-md">
            {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
