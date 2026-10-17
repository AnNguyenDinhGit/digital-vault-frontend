import { useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { validateHandoverDocument } from '../../utils/validators'
import FileField from '../common/FileField'

const DOCUMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt'

// Form nộp một giấy tờ cho hồ sơ bàn giao (giấy chứng tử, bằng chứng, biên bản hoàn tất).
// onSubmit nhận { file, signature } và trả Promise; ném lỗi thì hiện cảnh báo (đã được chuyển thành tiếng Việt ở nơi gọi).
export default function DocumentUploadForm({
  idPrefix,
  title,
  description,
  fileLabel,
  fileHint = 'PDF, PNG, JPEG hoặc TXT, tối đa 10 MB.',
  signatureRequired = false,
  submitLabel,
  onSubmit,
}) {
  const [form, setForm] = useState({ file: null, signature: null })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)
  // Đổi key để làm trống các ô chọn file sau khi nộp xong (không thể gán lại giá trị cho input file)
  const [resetKey, setResetKey] = useState(0)

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateHandoverDocument(form, { signatureRequired })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      await onSubmit(form)
      setForm({ file: null, signature: null })
      setResetKey((key) => key + 1)
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="av-panel d-flex flex-column gap-3" aria-label={title}>
      <div>
        <h2 className="mb-1 fw-bold text-ink" style={{ fontSize: 16 }}>
          {title}
        </h2>
        <p className="mb-0 fs-12 text-slate-500">{description}</p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-3">
        <FileField
          key={`file-${resetKey}`}
          id={`${idPrefix}-file`}
          label={fileLabel}
          hint={fileHint}
          accept={DOCUMENT_ACCEPT}
          required
          file={form.file}
          error={errors.file}
          onChange={(file) => setField('file', file)}
        />
        <FileField
          key={`signature-${resetKey}`}
          id={`${idPrefix}-signature`}
          label={signatureRequired ? 'Chữ ký số rời' : 'Chữ ký số rời (không bắt buộc)'}
          hint="File chữ ký RSA-SHA256 dạng nhị phân, tối đa 16 KB."
          required={signatureRequired}
          file={form.signature}
          error={errors.signature}
          onChange={(file) => setField('signature', file)}
        />
        {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}
        <div>
          <Button type="submit" variant="primary" className="av-btn av-btn-md" disabled={busy}>
            {busy ? 'Đang tải lên...' : submitLabel}
          </Button>
        </div>
      </form>
    </section>
  )
}
