import { FileUp, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { uploadDocument } from '../../callapi/ownerApi'
import { formatAllocation, formatFileSize } from '../../utils/catalog'
import { uploadErrorMessage } from '../../utils/uploadErrors'
import { validateUpload } from '../../utils/validators'

const EMPTY_FORM = { ownerStatus: 'alive', beneficiaryId: '', file: null, signature: null, deathCertificate: null }
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

// Modal tải giấy tờ lên một tài sản: chọn người thụ hưởng, file, và chữ ký rời (còn sống) hoặc giấy chứng tử (đã mất)
export default function UploadDocumentModal({ open, asset, beneficiaries, onClose, onUploaded }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Đổi key để làm trống các ô chọn file (không thể gán lại giá trị cho input file)
  const [resetKey, setResetKey] = useState(0)

  const hasBeneficiaries = beneficiaries.length > 0
  const isAlive = form.ownerStatus === 'alive'

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
        beneficiaryId: Number(form.beneficiaryId),
        ownerAlive: isAlive,
        signature: form.signature,
        deathCertificate: form.deathCertificate,
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
          </p>

          {!hasBeneficiaries && (
            <Alert variant="warning" className="mb-0 fs-13">
              Tài sản này chưa có người thụ hưởng. Hãy chỉ định người thụ hưởng trước khi tải giấy tờ.
            </Alert>
          )}

          <fieldset className="border-0 p-0 m-0">
            <legend className="av-label mb-2 float-none w-auto">Tình trạng chủ sở hữu</legend>
            <div className="d-flex gap-4">
              <Form.Check
                type="radio"
                id="owner-alive"
                name="ownerStatus"
                label="Còn sống"
                checked={isAlive}
                onChange={() => setField('ownerStatus', 'alive')}
              />
              <Form.Check
                type="radio"
                id="owner-dead"
                name="ownerStatus"
                label="Đã mất"
                checked={!isAlive}
                onChange={() => setField('ownerStatus', 'dead')}
              />
            </div>
            {!isAlive && (
              <p className="mt-2 mb-0 fs-12 text-slate-500">
                Lựa chọn này chỉ là khai báo, không chứng minh và không tự mở tài sản. Hồ sơ sẽ chờ xác minh pháp lý.
              </p>
            )}
          </fieldset>

          <div>
            <div className="mb-2">
              <label htmlFor="upload-beneficiary" className="av-label">
                Người thụ hưởng
                <span className="ms-1 text-danger"> *</span>
              </label>
            </div>
            <Form.Select
              id="upload-beneficiary"
              value={form.beneficiaryId}
              onChange={(event) => setField('beneficiaryId', event.target.value)}
              isInvalid={Boolean(errors.beneficiaryId)}
              aria-invalid={errors.beneficiaryId ? 'true' : undefined}
              aria-describedby={errors.beneficiaryId ? 'upload-beneficiary-error' : undefined}
              className="av-input"
            >
              <option value="">Chọn người thụ hưởng</option>
              {beneficiaries.map((b) => (
                <option key={b.beneficiaryId} value={b.beneficiaryId}>
                  {`${b.fullName} (${formatAllocation(b.allocation)})`}
                </option>
              ))}
            </Form.Select>
            {errors.beneficiaryId && (
              <p id="upload-beneficiary-error" className="av-error">
                {errors.beneficiaryId}
              </p>
            )}
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

          {isAlive ? (
            <FileField
              key={`signature-${resetKey}`}
              id="upload-signature"
              label="Chữ ký số rời"
              hint="File chữ ký RSA-SHA256 dạng nhị phân (không phải base64), tối đa 16 KB. Chứng thư của bạn phải được quản trị viên đăng ký trước."
              file={form.signature}
              error={errors.signature}
              onChange={(file) => setField('signature', file)}
            />
          ) : (
            <FileField
              key={`certificate-${resetKey}`}
              id="upload-certificate"
              label="Giấy chứng tử"
              hint="PDF, PNG, JPEG hoặc TXT, tối đa 10 MB."
              accept={DOCUMENT_ACCEPT}
              file={form.deathCertificate}
              error={errors.deathCertificate}
              onChange={(file) => setField('deathCertificate', file)}
            />
          )}

          {submitError && <Alert variant="danger" className="av-alert">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !hasBeneficiaries} className="av-btn av-btn-md">
            {isSubmitting ? 'Đang tải lên...' : 'Tải lên'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
