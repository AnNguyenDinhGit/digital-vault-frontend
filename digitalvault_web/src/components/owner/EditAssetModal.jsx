import { PackageCheck, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { deleteAsset, updateAsset } from '../../callapi/ownerApi'
import { ASSET_TYPE_LABELS } from '../../utils/catalog'
import { validateAsset } from '../../utils/validators'
import TextField from '../common/TextField'

// Chuyển lỗi API sửa/xóa tài sản sang thông báo tiếng Việt
function assetErrorMessage(error) {
  if (error?.status === 404) return 'Không tìm thấy tài sản. Vui lòng tải lại trang.'
  if (error?.status === 400) return 'Thông tin tài sản không hợp lệ. Vui lòng kiểm tra lại.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

// Modal sửa tài sản, có bước xác nhận khi xóa. Chỉ mount khi mở để form luôn lấy dữ liệu mới nhất.
// impact = { documents, beneficiaries } là những gì sẽ mất theo tài sản khi xóa.
export default function EditAssetModal({ asset, impact, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({ name: asset.name, type: asset.type, description: asset.description ?? '' })
  const [errors, setErrors] = useState({})
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const typeOptions = ASSET_TYPE_LABELS[asset.type] ? ASSET_TYPE_LABELS : { ...ASSET_TYPE_LABELS, [asset.type]: asset.type }

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
    const nextErrors = validateAsset(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      onSaved(await updateAsset(asset.assetId, form))
    } catch (error) {
      setBusy(false)
      setSubmitError(assetErrorMessage(error))
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    setSubmitError('')
    try {
      await deleteAsset(asset.assetId)
      onDeleted()
    } catch (error) {
      setBusy(false)
      setSubmitError(assetErrorMessage(error))
    }
  }

  const titleId = confirmingDelete ? 'delete-asset-title' : 'edit-asset-title'

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby={titleId}>
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            {confirmingDelete ? <Trash2 size={20} aria-hidden="true" /> : <PackageCheck size={20} aria-hidden="true" />}
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">DIGITAL ASSET</span>
            <h2 id={titleId} className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              {confirmingDelete ? 'Xác Nhận Xóa Tài Sản' : 'Chỉnh Sửa Tài Sản'}
            </h2>
          </div>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      {confirmingDelete ? (
        <>
          <div className="av-modal-body d-flex flex-column gap-3">
            <p className="mb-0 fs-13 text-slate-600">
              {`Bạn sắp xóa tài sản "${asset.name}". Thao tác này sẽ xóa ${impact.documents} giấy tờ đính kèm và gỡ ${impact.beneficiaries} người thụ hưởng khỏi tài sản, không thể hoàn tác.`}
            </p>
            {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}
          </div>
          <div className="av-modal-foot justify-content-end gap-2">
            <Button type="button" variant="light" onClick={() => setConfirmingDelete(false)} disabled={busy} className="av-btn av-btn-md border">
              Quay lại
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={busy} className="av-btn av-btn-md">
              {busy ? 'Đang xử lý dữ liệu...' : 'Xác nhận xóa'}
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="av-modal-body d-flex flex-column gap-4">
            <TextField
              id="edit-asset-name"
              name="name"
              label="Tên tài sản"
              required
              value={form.name}
              onChange={handleChange}
              error={errors.name}
            />

            <div>
              <div className="mb-2">
                <label htmlFor="edit-asset-type" className="av-label">
                  Loại tài sản
                  <span className="ms-1 text-danger"> *</span>
                </label>
              </div>
              <Form.Select
                id="edit-asset-type"
                name="type"
                value={form.type}
                onChange={handleChange}
                isInvalid={Boolean(errors.type)}
                aria-invalid={errors.type ? 'true' : undefined}
                className="av-input"
              >
                {Object.entries(typeOptions).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Form.Select>
              {errors.type && <p className="av-error">{errors.type}</p>}
            </div>

            <TextField
              id="edit-asset-description"
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

          <div className="av-modal-foot justify-content-between gap-2">
            <Button type="button" variant="light" onClick={() => setConfirmingDelete(true)} disabled={busy} className="av-btn av-btn-md border text-danger">
              <Trash2 size={14} aria-hidden="true" />
              Xóa tài sản
            </Button>
            <div className="d-flex gap-2">
              <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={busy} className="av-btn av-btn-md">
                {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
