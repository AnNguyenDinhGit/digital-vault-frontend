import { Percent, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Alert, Button, Modal } from 'react-bootstrap'
import { updateBeneficiaryAllocation } from '../../callapi/ownerApi'
import { ownerMutationErrorMessage } from '../../utils/ownerErrors'
import TextField from '../common/TextField'

const round2 = (value) => Math.round(value * 100) / 100

// Phần tối đa người này được hưởng ở một tài sản = 100% trừ phần của những người khác
function withMaximum(person, beneficiaries) {
  return person.items.map((item) => {
    const others = beneficiaries
      .filter((row) => row.assetId === item.assetId && row.beneficiaryId !== person.beneficiaryId && row.status !== 'Pending')
      .reduce((sum, row) => sum + row.allocation, 0)
    return { ...item, max: round2(100 - others) }
  })
}

function isValidAllocation(text, max) {
  if (text.trim() === '') return false
  const value = Number(text)
  return Number.isFinite(value) && value >= 0.01 && value <= max && round2(value) === value
}

// Modal sửa tỷ lệ phân bổ của một người trên từng tài sản. Chỉ mount khi mở.
// onChanged: đã lưu được ít nhất một dòng (trang cần tải lại); onClose: đóng mà không đổi gì.
export default function EditAllocationModal({ person, beneficiaries, onClose, onChanged }) {
  const rows = withMaximum(person, beneficiaries)
  const [values, setValues] = useState(() => Object.fromEntries(rows.map((row) => [row.assetId, String(row.allocation)])))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const savedAny = useRef(false)

  const changedRows = rows.filter((row) => Number(values[row.assetId]) !== row.allocation || values[row.assetId].trim() === '')

  const setValue = (assetId, value) => {
    setValues((prev) => ({ ...prev, [assetId]: value }))
    setErrors((prev) => ({ ...prev, [assetId]: undefined }))
  }

  const handleClose = () => {
    if (busy) return
    if (savedAny.current) onChanged()
    else onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const nextErrors = {}
    for (const row of changedRows) {
      if (!isValidAllocation(values[row.assetId], row.max)) {
        nextErrors[row.assetId] = `Tỷ lệ phải từ 0.01% đến ${row.max}%, tối đa 2 chữ số thập phân.`
      }
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    const failed = []
    let firstError = null
    for (const row of changedRows) {
      try {
        await updateBeneficiaryAllocation(row.assetId, person.beneficiaryId, values[row.assetId])
        savedAny.current = true
      } catch (error) {
        failed.push(row.assetName)
        firstError ??= error
      }
    }
    if (failed.length === 0) {
      onChanged()
      return
    }
    setBusy(false)
    setSubmitError(`Không cập nhật được: ${failed.join(', ')}. ${ownerMutationErrorMessage(firstError)}`)
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="edit-allocation-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <Percent size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">BENEFICIARY</span>
            <h2 id="edit-allocation-title" className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Sửa Phân Quyền Người Thụ Hưởng
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
            Người thụ hưởng: <strong className="text-ink">{person.fullName}</strong>
          </p>
          {rows.map((row) => (
            <TextField
              key={row.assetId}
              id={`allocation-${row.assetId}`}
              name={`allocation-${row.assetId}`}
              type="number"
              step="0.01"
              min="0.01"
              label={row.assetName}
              labelAside={<span className="fs-11 text-slate-400">{`Tối đa ${row.max}%`}</span>}
              rightSlot={<span className="fs-12 text-slate-400 pe-2">%</span>}
              disabled={busy}
              value={values[row.assetId]}
              onChange={(event) => setValue(row.assetId, event.target.value)}
              error={errors[row.assetId]}
            />
          ))}
          {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={busy || changedRows.length === 0} className="av-btn av-btn-md">
            {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
