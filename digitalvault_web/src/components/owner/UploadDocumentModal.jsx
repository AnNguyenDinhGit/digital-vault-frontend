import { FileUp, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { uploadDocument } from '../../callapi/ownerApi'
import { formatAllocation, formatFileSize } from '../../utils/catalog'
import { uploadErrorMessage } from '../../utils/uploadErrors'
import { validateUpload } from '../../utils/validators'

const EMPTY_FORM = { beneficiaryId: '', file: null, signature: null }
const DOCUMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt'

// Ô chọn file kèm nhãn, gợi ý, tên và dung lượng file đã chọn, thông báo lỗi
function FileField({ id, label, hint, accept, file, error, onChange }) {
  return (
    <div>
      <div className="mb-2">
        <label htmlFor={id} className="av-label">
          {label}
          <span className="ms-1 text-danger"> *</span>
        </label>
      </div>
      <Form.Control
        id={id}
        type="file"
        accept={accept}
        isInvalid={Boolean(error)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <p className="mt-1 mb-0 fs-11 text-slate-500">{file ? `${file.name} · ${formatFileSize(file.size)}` : hint}</p>
      {error && (
        <p id={`${id}-error`} className="av-error">
          {error}
        </p>
      )}
    </div>
  )
}

// Modal tải giấy tờ lên một tài sản: file giấy tờ + chữ ký số rời (bắt buộc), người thụ hưởng là tuỳ chọn.
// Giấy chứng tử không nộp ở đây mà do Người thi hành nộp trong hồ sơ bàn giao.
export default function UploadDocumentModal({ open, asset, beneficiaries, onClose, onUploaded }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Đổi key để làm trống các ô chọn file (không thể gán lại giá trị cho input file)
  const [resetKey, setResetKey] = useState(0)

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const reset = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setSubmitError('')
    setResetKey((key) => key + 1)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateUpload(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await uploadDocument(asset.assetId, {
        file: form.file,
        signature: form.signature,
        beneficiaryId: form.beneficiaryId ? Number(form.beneficiaryId) : undefined,
      })
      reset()
      onUploaded()
    } catch (error) {
      setSubmitError(uploadErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={open} onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="upload-document-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <FileUp size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">OWNERSHIP PROOF</span>
            <h2 id="upload-document-title" className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Thêm Giấy Tờ Chứng Minh
            </h2>
          </div>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-4">
          <p className="mb-0 fs-12 text-slate-500">
            Giấy tờ cho tài sản <strong className="text-ink">{asset.name}</strong> được mã hóa AES-256-GCM trước khi lưu trữ.
            Giấy chứng tử do Người thi hành nộp khi tạo hồ sơ bàn giao, không cần tải ở đây.
          </p>

          <div>
            <div className="mb-2">
              <label htmlFor="upload-beneficiary" className="av-label">
                Người thụ hưởng
              </label>
            </div>
            <Form.Select
              id="upload-beneficiary"
              value={form.beneficiaryId}
              onChange={(event) => setField('beneficiaryId', event.target.value)}
              className="av-input"
            >
              <option value="">Không gắn người thụ hưởng cụ thể</option>
              {beneficiaries.map((b) => (
                <option key={b.beneficiaryId} value={b.beneficiaryId}>
                  {`${b.fullName} (${formatAllocation(b.allocation)})`}
                </option>
              ))}
            </Form.Select>
          </div>

          <FileField
            key={`file-${resetKey}`}
            id="upload-file"
            label="Giấy tờ đính kèm"
            hint="PDF, PNG, JPEG hoặc TXT, tối đa 10 MB."
            accept={DOCUMENT_ACCEPT}
            file={form.file}
            error={errors.file}
            onChange={(file) => setField('file', file)}
          />

          <FileField
            key={`signature-${resetKey}`}
            id="upload-signature"
            label="Chữ ký số rời"
            hint="File chữ ký RSA-SHA256 dạng nhị phân (không phải base64), tối đa 16 KB. Chứng thư của bạn phải được quản trị viên đăng ký trước."
            file={form.signature}
            error={errors.signature}
            onChange={(file) => setField('signature', file)}
          />

          {submitError && <Alert variant="danger" className="av-alert">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="av-btn av-btn-md">
            {isSubmitting ? 'Đang tải lên...' : 'Tải lên'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
