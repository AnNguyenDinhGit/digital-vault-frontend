import { Check, ChevronDown, ExternalLink, PackagePlus, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, Button, Dropdown, Form, Modal } from 'react-bootstrap'
import { assignExecutor, createAsset, getExecutors } from '../../callapi/ownerApi'
import { executorErrorMessage } from '../../utils/executor'
import { ASSET_TYPE_LABELS, getInitials } from '../../utils/catalog'
import { validateAsset } from '../../utils/validators'
import TextField from '../common/TextField'

const EMPTY_FORM = { name: '', type: '', description: '' }

// Chuyển lỗi API tạo tài sản sang thông báo tiếng Việt
function createAssetErrorMessage(error) {
  if (error?.status === 404) return 'Không tìm thấy kho. Vui lòng tải lại trang.'
  if (error?.status === 409) return 'Kho này đang không hoạt động. Vui lòng chọn kho khác.'
  if (error?.status === 400) return 'Thông tin tài sản không hợp lệ. Vui lòng kiểm tra lại.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

// Mở chi tiết Executor ở cửa sổ mới. Không dùng noopener để cửa sổ mới thừa hưởng phiên đăng nhập (sessionStorage)
function openExecutorDetail(executorId, vaultId) {
  const query = vaultId ? `?vaultId=${vaultId}` : ''
  window.open(`/owner/executors/${executorId}/view${query}`, '_blank', 'popup=yes,width=560,height=680')
}

// Nút chữ rõ ràng "Xem chi tiết", dừng nổi bọt để bấm vào không làm đổi lựa chọn của dòng
function ExecutorDetailButton({ executor, vaultId }) {
  return (
    <button
      type="button"
      className="av-ghost-btn is-brand flex-shrink-0"
      aria-label={`Xem chi tiết ${executor.fullName} ở cửa sổ mới`}
      onClick={(event) => {
        event.stopPropagation()
        openExecutorDetail(executor.executorId, vaultId)
      }}
    >
      <ExternalLink size={14} aria-hidden="true" />
      Xem chi tiết
    </button>
  )
}

// Modal thêm tài sản vào kho đang chọn; onCreated nhận tài sản vừa tạo từ BE và (tuỳ chọn) lỗi khi gán Executor.
// currentExecutorId là Executor đã gán cho kho (nếu biết) để chọn sẵn và không gán lại.
export default function AddAssetModal({ open, vault, currentExecutorId = null, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [executors, setExecutors] = useState({ status: 'loading', items: [] })
  // undefined = chưa chọn gì, dùng Executor hiện tại của kho
  const [picked, setPicked] = useState(undefined)
  const [menuOpen, setMenuOpen] = useState(false)
  const executorId = picked === undefined ? currentExecutorId : picked
  const setExecutorId = (value) => setPicked(value === currentExecutorId ? undefined : value)

  // Mỗi lần mở modal tải lại danh sách Executor
  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    getExecutors()
      .then((items) => {
        if (!cancelled) setExecutors({ status: 'ready', items })
      })
      .catch(() => {
        if (!cancelled) setExecutors({ status: 'error', items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const selectedExecutor = executors.items.find((item) => item.executorId === executorId)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = validateAsset(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const asset = await createAsset({ vaultId: vault.vaultId, ...form })
      setForm(EMPTY_FORM)
      setPicked(undefined)
      // Executor gán theo kho (không theo tài sản): tài sản đã tạo xong nên lỗi gán chỉ báo lại, không tạo lại tài sản
      let executorError = ''
      if (executorId && executorId !== currentExecutorId) {
        try {
          await assignExecutor(vault.vaultId, executorId)
        } catch (error) {
          executorError = executorErrorMessage(error)
        }
      }
      onCreated(asset, { executorError })
    } catch (error) {
      setSubmitError(createAssetErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={open} onHide={onClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="add-asset-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <PackagePlus size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">DIGITAL ASSET</span>
            <h2 id="add-asset-title" className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Thêm Tài Sản Số Mới
            </h2>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-4">
          <p className="mb-0 fs-12 text-slate-500">
            Lưu vào kho: <strong className="text-ink">{vault?.name}</strong>
          </p>
          <TextField
            id="asset-name"
            name="name"
            label="Tên tài sản"
            required
            placeholder="Ví dụ: Tài khoản tiết kiệm Vietcombank"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
          />

          <div>
            <div className="mb-2">
              <label htmlFor="asset-type" className="av-label">
                Loại tài sản
                <span className="ms-1 text-danger"> *</span>
              </label>
            </div>
            <Form.Select
              id="asset-type"
              name="type"
              value={form.type}
              onChange={handleChange}
              isInvalid={Boolean(errors.type)}
              aria-invalid={errors.type ? 'true' : undefined}
              aria-describedby={errors.type ? 'asset-type-error' : undefined}
              className="av-input"
            >
              <option value="">Chọn loại tài sản</option>
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Form.Select>
            {errors.type && (
              <p id="asset-type-error" className="av-error">
                {errors.type}
              </p>
            )}
          </div>

          <TextField
            id="asset-description"
            name="description"
            label="Mô tả"
            as="textarea"
            rows={3}
            placeholder="Thông tin mô tả tài sản (không bắt buộc)"
            value={form.description}
            onChange={handleChange}
            inputClassName="av-textarea"
            error={errors.description}
          />

          <div>
            <div className="mb-2">
              <span id="asset-executor-label" className="av-label">Người thi hành (Executor)</span>
              <span className="ms-2 fs-12 text-slate-500">Không bắt buộc, áp dụng cho cả kho</span>
            </div>
            {executors.status === 'loading' && (
              <p className="mb-0 d-flex align-items-center gap-2 fs-12 text-slate-500">
                <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
                Đang tải danh sách người thi hành...
              </p>
            )}
            {executors.status === 'error' && (
              <p className="mb-0 fs-12 text-slate-500">Không tải được danh sách người thi hành. Bạn có thể gán sau ở mục Người thi hành.</p>
            )}
            {executors.status === 'ready' && (
              <div className="d-flex flex-column gap-2">
                <Dropdown show={menuOpen} onToggle={setMenuOpen} autoClose="outside">
                  <Dropdown.Toggle
                    as="button"
                    type="button"
                    id="asset-executor"
                    aria-labelledby="asset-executor-label"
                    disabled={isSubmitting}
                    className={`av-exec-toggle${selectedExecutor ? ' has-value' : ''}`}
                  >
                    {selectedExecutor ? (
                      <span className="d-flex align-items-center gap-3 text-start" style={{ minWidth: 0 }}>
                        <span className="av-avatar-sm">{getInitials(selectedExecutor.fullName)}</span>
                        <span style={{ minWidth: 0 }}>
                          <span className="d-block fw-semibold text-ink text-truncate fs-14">{selectedExecutor.fullName}</span>
                          <span className="d-block fs-11 text-slate-500">Người thi hành (Executor)</span>
                        </span>
                      </span>
                    ) : (
                      <span className="d-flex align-items-center gap-3 text-slate-500 fs-14">
                        <span className="av-avatar-sm is-empty"><UserRound size={14} aria-hidden="true" /></span>
                        Chọn người thi hành
                      </span>
                    )}
                    <ChevronDown size={16} aria-hidden="true" className="flex-shrink-0 text-slate-400" />
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="av-exec-menu w-100 p-2" role="listbox" aria-label="Danh sách người thi hành">
                    {executors.items.length === 0 && <p className="av-empty mb-0 p-3">Chưa có người thi hành nào.</p>}
                    {executors.items.map((item) => {
                      const isSelected = item.executorId === executorId
                      const choose = () => {
                        setExecutorId(item.executorId)
                        setMenuOpen(false)
                      }
                      return (
                        <div
                          key={item.executorId}
                          role="option"
                          aria-selected={isSelected}
                          tabIndex={0}
                          className={`av-exec-row${isSelected ? ' is-selected' : ''}`}
                          onClick={choose}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              choose()
                            }
                          }}
                        >
                          <span className="av-avatar-sm">{getInitials(item.fullName)}</span>
                          <span className="flex-grow-1" style={{ minWidth: 0 }}>
                            <span className="d-block fw-semibold text-ink text-truncate fs-13">{item.fullName}</span>
                            <span className="d-block fs-11 text-slate-500">
                              {item.executorId === currentExecutorId ? 'Đang phụ trách kho này' : 'Người thi hành (Executor)'}
                            </span>
                          </span>
                          {isSelected && <Check size={16} aria-label="Đang chọn" className="text-brand flex-shrink-0" />}
                          <ExecutorDetailButton executor={item} vaultId={vault?.vaultId} />
                        </div>
                      )
                    })}
                  </Dropdown.Menu>
                </Dropdown>

                {selectedExecutor && (
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span className="fs-12 text-slate-500">
                      {selectedExecutor.executorId === currentExecutorId
                        ? 'Người thi hành hiện tại của kho.'
                        : 'Sẽ được gán cho cả kho sau khi lưu tài sản.'}
                    </span>
                    <ExecutorDetailButton executor={selectedExecutor} vaultId={vault?.vaultId} />
                  </div>
                )}
              </div>
            )}
          </div>

          {submitError && <Alert variant="danger" className="av-alert">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={onClose} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="av-btn av-btn-md">
            {isSubmitting ? 'Đang lưu...' : 'Lưu tài sản'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
