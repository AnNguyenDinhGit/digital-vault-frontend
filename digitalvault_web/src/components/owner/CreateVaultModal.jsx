import { Vault, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { createVault } from '../../callapi/ownerApi'
import { validateVault } from '../../utils/validators'
import TextField from '../common/TextField'

const EMPTY_FORM = { name: '', description: '' }

function createVaultErrorMessage(error) {
  if (error?.status === 400) return 'Thông tin kho không hợp lệ. Vui lòng kiểm tra lại.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

// Modal tạo kho lưu trữ mới; onCreated nhận kho vừa tạo từ BE
export default function CreateVaultModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateVault(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const vault = await createVault(form)
      setForm(EMPTY_FORM)
      onCreated(vault)
    } catch (error) {
      setSubmitError(createVaultErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={open} onHide={onClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="create-vault-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <Vault size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">VAULT SETUP</span>
            <h2 id="create-vault-title" className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Tạo Kho Lưu Trữ Mới
            </h2>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-4">
          <TextField
            id="vault-name"
            name="name"
            label="Tên kho"
            required
            placeholder="Ví dụ: Kho tài sản gia đình"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
          />
          <TextField
            id="vault-description"
            name="description"
            label="Mô tả"
            as="textarea"
            rows={3}
            placeholder="Mô tả ngắn về kho (không bắt buộc)"
            value={form.description}
            onChange={handleChange}
            inputClassName="av-textarea"
            error={errors.description}
          />
          {submitError && <Alert variant="danger" className="av-alert">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={onClose} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="av-btn av-btn-md">
            {isSubmitting ? 'Đang tạo...' : 'Tạo kho'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
