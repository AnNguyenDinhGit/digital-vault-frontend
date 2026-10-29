import { useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { assignBeneficiary } from '../../callapi/ownerApi'
import { assignErrorMessage } from '../../utils/beneficiaryErrors'
import { validateBeneficiary } from '../../utils/validators'
import TextField from '../common/TextField'

const EMPTY_FORM = { email: '', allocation: '' }

// Form chỉ định người thụ hưởng bằng email đã đăng ký; remaining là % còn có thể phân bổ
export default function AssignBeneficiaryForm({ assetId, remaining, onAssigned }) {
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
    const nextErrors = validateBeneficiary(form, remaining)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await assignBeneficiary(assetId, {
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
    <form aria-label="Chỉ định người thụ hưởng" onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
      <p className="mb-0 fs-12 text-slate-500">{`Có thể phân bổ tối đa ${remaining}%. Người thụ hưởng cần có tài khoản đã đăng ký.`}</p>
      <TextField
        id="beneficiary-email"
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
        id="beneficiary-allocation"
        name="allocation"
        type="text"
        inputMode="decimal"
        label="Tỷ lệ phân bổ (%)"
        required
        autoComplete="off"
        placeholder="Ví dụ: 50"
        value={form.allocation}
        onChange={handleChange}
        error={errors.allocation}
      />
      {submitError && <Alert variant="danger" className="av-alert">{submitError}</Alert>}
      <Button type="submit" variant="primary" disabled={isSubmitting} className="av-btn av-btn-sm align-self-start">
        {isSubmitting ? 'Đang lưu...' : 'Chỉ định'}
      </Button>
    </form>
  )
}
