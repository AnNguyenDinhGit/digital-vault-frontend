import { CreditCard, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { createAdminPlan, updateAdminPlan } from '../../callapi/adminApi'
import { adminPlanErrorMessage, planFormToInput, planToForm, validatePlanForm } from '../../utils/payment'
import TextField from '../common/TextField'

// Hộp thoại Admin tạo gói mới (plan = null) hoặc sửa gói; onSaved nhận gói BE trả về
export default function PlanFormModal({ plan = null, onClose, onSaved }) {
  const [form, setForm] = useState(() => planToForm(plan))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)
  const isEdit = Boolean(plan)

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
    const nextErrors = validatePlanForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      const input = planFormToInput(form, plan)
      const saved = isEdit ? await updateAdminPlan(plan.planId, input) : await createAdminPlan(input)
      onSaved(saved, !isEdit)
    } catch (error) {
      setBusy(false)
      setSubmitError(adminPlanErrorMessage(error, 'save'))
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="plan-form-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <CreditCard size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">SUBSCRIPTION PLAN</span>
            <h2 id="plan-form-title" className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              {isEdit ? 'Sửa Gói Dịch Vụ' : 'Thêm Gói Dịch Vụ'}
            </h2>
          </div>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-3">
          <TextField id="plan-name" name="planName" label="Tên gói" required placeholder="Ví dụ: Gói Cơ bản" value={form.planName} onChange={handleChange} error={errors.planName} disabled={busy} />
          <div className="row g-3">
            <TextField id="plan-vaults" name="maxVaults" type="number" min="1" label="Số kho tối đa" required className="col-12 col-md-6" value={form.maxVaults} onChange={handleChange} error={errors.maxVaults} disabled={busy} />
            <TextField id="plan-storage" name="storageGb" type="number" min="0" step="any" label="Dung lượng tối đa (GB)" required className="col-12 col-md-6" value={form.storageGb} onChange={handleChange} error={errors.storageGb} disabled={busy} />
            <TextField id="plan-price" name="price" type="number" min="0" label="Giá (₫)" required className="col-12 col-md-6" value={form.price} onChange={handleChange} error={errors.price} disabled={busy} />
            <TextField id="plan-duration" name="durationDays" type="number" min="1" label="Thời hạn (ngày)" required className="col-12 col-md-6" value={form.durationDays} onChange={handleChange} error={errors.durationDays} disabled={busy} />
          </div>
          <Form.Check
            type="switch"
            id="plan-active"
            label="Đang bán (người dùng thấy và mua được gói này)"
            checked={form.isActive}
            disabled={busy}
            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
          />
          {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={busy} className="av-btn av-btn-md">
            {busy ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo gói'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
