import { UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { assignBeneficiary } from '../../callapi/ownerApi'
import { assignErrorMessage } from '../../utils/beneficiaryErrors'
import { validateAssignment } from '../../utils/validators'
import TextField from '../common/TextField'

const EMPTY_FORM = { assetId: '', email: '', allocation: '' }

// Modal chỉ định người thụ hưởng: chọn tài sản còn % chưa phân bổ, nhập email đã đăng ký và tỷ lệ
export default function AddBeneficiaryModal({ open, assets, onClose, onAssigned }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedAsset = assets.find((asset) => String(asset.assetId) === form.assetId)
  const remaining = selectedAsset?.remaining ?? 100

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateAssignment(form, remaining)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await assignBeneficiary(Number(form.assetId), {
        email: form.email,
        allocation: Number(form.allocation.trim().replace(',', '.')),
      })
      setForm(EMPTY_FORM)
      onAssigned()
    } catch (error) {
      setSubmitError(assignErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={open} onHide={onClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="add-beneficiary-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <UserPlus size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">PERMISSION MAPPING</span>
            <h2 id="add-beneficiary-title" className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Thêm Người Thụ Hưởng
            </h2>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-4">
          <div>
            <div className="mb-2">
              <label htmlFor="beneficiary-asset" className="av-label">
                Tài sản
                <span className="ms-1 text-danger"> *</span>
              </label>
            </div>
            <Form.Select
              id="beneficiary-asset"
              name="assetId"
              value={form.assetId}
              onChange={handleChange}
              isInvalid={Boolean(errors.assetId)}
              aria-invalid={errors.assetId ? 'true' : undefined}
              aria-describedby={errors.assetId ? 'beneficiary-asset-error' : undefined}
              className="av-input"
            >
              <option value="">Chọn tài sản</option>
              {assets.map((asset) => (
                <option key={asset.assetId} value={asset.assetId}>
                  {`${asset.name} (còn ${asset.remaining}%)`}
                </option>
              ))}
            </Form.Select>
            {errors.assetId && (
              <p id="beneficiary-asset-error" className="av-error">
                {errors.assetId}
              </p>
            )}
          </div>

          <TextField
            id="beneficiary-modal-email"
            name="email"
            type="email"
            label="Email người thụ hưởng"
            required
            autoComplete="off"
            placeholder="nguoi.thu.huong@example.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
          <TextField
            id="beneficiary-modal-allocation"
            name="allocation"
            type="text"
            inputMode="decimal"
            label="Tỷ lệ phân bổ (%)"
            required
            autoComplete="off"
            placeholder={selectedAsset ? `Tối đa ${remaining}` : 'Ví dụ: 50'}
            value={form.allocation}
            onChange={handleChange}
            error={errors.allocation}
          />
          <p className="mb-0 fs-12 text-slate-500">Người thụ hưởng cần có tài khoản đã đăng ký trên hệ thống.</p>

          {submitError && <Alert variant="danger" className="av-alert">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={onClose} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="av-btn av-btn-md">
            {isSubmitting ? 'Đang lưu...' : 'Chỉ định'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
