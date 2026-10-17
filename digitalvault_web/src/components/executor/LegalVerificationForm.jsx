import { useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { validateLegalRequest } from '../../utils/validators'
import FileField from '../common/FileField'
import TextField from '../common/TextField'

const EMPTY = { verifierId: '', comment: '', evidence: null }

// Form gửi hồ sơ cho người xác minh pháp lý. onSubmit nhận { verifierId, comment, evidence }; lỗi ném ra đã là thông báo tiếng Việt.
export default function LegalVerificationForm({ onSubmit }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateLegalRequest(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      await onSubmit({ verifierId: Number(form.verifierId), comment: form.comment, evidence: form.evidence })
    } catch (error) {
      setSubmitError(error.message)
      setBusy(false)
    }
  }

  return (
    <section className="av-panel d-flex flex-column gap-3" aria-label="Gửi thẩm định pháp lý">
      <div>
        <h2 className="mb-1 fw-bold text-ink" style={{ fontSize: 16 }}>
          Gửi thẩm định pháp lý
        </h2>
        <p className="mb-0 fs-12 text-slate-500">
          Cần nộp giấy chứng tử trước. Người xác minh phải độc lập với bạn, chủ kho và người thụ hưởng.
        </p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
        <TextField
          id="legal-verifier"
          name="verifierId"
          type="number"
          min="1"
          label="ID người xác minh pháp lý"
          required
          disabled={busy}
          value={form.verifierId}
          onChange={(event) => setField('verifierId', event.target.value)}
          error={errors.verifierId}
        />
        <TextField
          id="legal-comment"
          name="comment"
          label="Ghi chú"
          as="textarea"
          rows={3}
          disabled={busy}
          inputClassName="av-textarea"
          placeholder="Ghi chú cho người xác minh (không bắt buộc)"
          value={form.comment}
          onChange={(event) => setField('comment', event.target.value)}
          error={errors.comment}
        />
        <FileField
          id="legal-evidence"
          label="Bằng chứng gửi kèm"
          hint="PDF, PNG, JPEG hoặc TXT, tối đa 10 MB."
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          required
          file={form.evidence}
          error={errors.evidence}
          onChange={(file) => setField('evidence', file)}
        />
        {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}
        <div>
          <Button type="submit" variant="primary" className="av-btn av-btn-md" disabled={busy}>
            {busy ? 'Đang gửi...' : 'Gửi thẩm định'}
          </Button>
        </div>
      </form>
    </section>
  )
}
