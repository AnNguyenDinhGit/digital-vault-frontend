import { Save, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { updateSystemConfig } from '../../callapi/adminApi'
import { formatBytes, validateSystemConfig } from '../../utils/admin'
import { formatDateTime } from '../../utils/proofOfLife'
import TextField from '../common/TextField'

// Form giữ số dưới dạng chuỗi để người dùng gõ được tự do; chuyển lại thành số khi gửi
const toForm = (config) => ({
  defaultAlgorithm: config.encryptionPolicy.defaultAlgorithm,
  keyRotationIntervalDays: String(config.encryptionPolicy.keyRotationIntervalDays),
  minPasswordLength: String(config.encryptionPolicy.minPasswordLength),
  require2FAForAdmin: config.encryptionPolicy.require2FAForAdmin,
  defaultPingIntervalDays: String(config.proofOfLifePolicy.defaultPingIntervalDays),
  gracePeriodDays: String(config.proofOfLifePolicy.gracePeriodDays),
  warningDaysBeforeGrace: String(config.proofOfLifePolicy.warningDaysBeforeGrace),
  maxUploadSizeBytes: String(config.storagePolicy.maxUploadSizeBytes),
  allowedExtensions: config.storagePolicy.allowedExtensions.join(', '),
  autoBackupEnabled: config.backupPolicy.autoBackupEnabled,
  cronSchedule: config.backupPolicy.cronSchedule,
  retentionDays: String(config.backupPolicy.retentionDays),
})

// Ô trống coi là không hợp lệ (NaN) thay vì thành 0
const num = (text) => (text.trim() === '' ? Number.NaN : Number(text))

function toInput(form) {
  return {
    encryptionPolicy: {
      defaultAlgorithm: form.defaultAlgorithm,
      keyRotationIntervalDays: num(form.keyRotationIntervalDays),
      minPasswordLength: num(form.minPasswordLength),
      require2FAForAdmin: form.require2FAForAdmin,
    },
    proofOfLifePolicy: {
      defaultPingIntervalDays: num(form.defaultPingIntervalDays),
      gracePeriodDays: num(form.gracePeriodDays),
      warningDaysBeforeGrace: num(form.warningDaysBeforeGrace),
    },
    storagePolicy: {
      maxUploadSizeBytes: num(form.maxUploadSizeBytes),
      allowedExtensions: form.allowedExtensions
        .split(/[\s,]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    },
    backupPolicy: {
      autoBackupEnabled: form.autoBackupEnabled,
      cronSchedule: form.cronSchedule.trim(),
      retentionDays: num(form.retentionDays),
    },
  }
}

function saveErrorMessage(error) {
  if (error?.status === 400) return 'Cấu hình không hợp lệ. Vui lòng kiểm tra lại.'
  if (error?.status === 403) return 'Bạn không có quyền Quản trị hệ thống.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

function Section({ title, description, children }) {
  return (
    <section className="av-panel d-flex flex-column gap-3" aria-label={title}>
      <div>
        <h2 className="mb-1 fw-bold text-ink" style={{ fontSize: 17 }}>
          {title}
        </h2>
        <p className="mb-0 fs-12 text-slate-500">{description}</p>
      </div>
      <div className="row g-3">{children}</div>
    </section>
  )
}

// Form sửa toàn bộ tham số hệ thống (mã hóa, điểm danh, lưu trữ, sao lưu); BE thay nguyên từng nhóm nên luôn gửi đủ 4 nhóm
export default function SystemConfigForm({ config, onSaved }) {
  const [initial] = useState(() => toForm(config))
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial])

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }
  const handleText = (event) => setField(event.target.name, event.target.value)
  const handleCheck = (event) => setField(event.target.name, event.target.checked)

  const handleRevert = () => {
    setForm(initial)
    setErrors({})
    setSubmitError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    const input = toInput(form)
    const nextErrors = validateSystemConfig(input)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      onSaved(await updateSystemConfig(input))
    } catch (error) {
      setBusy(false)
      setSubmitError(saveErrorMessage(error))
    }
  }

  const numberField = (name, label, extra = {}) => (
    <div className="col-12 col-md-6">
      <TextField id={`cfg-${name}`} name={name} label={label} type="number" inputMode="numeric" value={form[name]} onChange={handleText} error={errors[name]} {...extra} />
    </div>
  )

  const uploadSize = num(form.maxUploadSizeBytes)

  return (
    <form onSubmit={handleSubmit} noValidate className="d-flex flex-column gap-4">
      <p className="mb-0 fs-12 text-slate-500">
        {`Cập nhật lần cuối: ${formatDateTime(config.lastUpdatedAt)} bởi ${config.updatedByAdminEmail || 'hệ thống'}`}
      </p>

      <Section title="Chính sách mã hóa" description="Thuật toán và chu kỳ xoay khóa, độ mạnh mật khẩu.">
        <div className="col-12 col-md-6">
          <TextField id="cfg-defaultAlgorithm" name="defaultAlgorithm" label="Thuật toán mã hóa mặc định" value={form.defaultAlgorithm} readOnly />
        </div>
        {numberField('keyRotationIntervalDays', 'Chu kỳ xoay khóa (ngày)')}
        {numberField('minPasswordLength', 'Độ dài mật khẩu tối thiểu')}
        <div className="col-12 col-md-6 d-flex align-items-end">
          <Form.Check type="checkbox" id="cfg-require2FAForAdmin" name="require2FAForAdmin" label="Bắt buộc xác thực hai lớp cho Admin" checked={form.require2FAForAdmin} onChange={handleCheck} />
        </div>
      </Section>

      <Section title="Chính sách điểm danh sự sống" description="Chu kỳ điểm danh của Owner và thời gian ân hạn trước khi hệ thống mở quy trình bàn giao.">
        {numberField('defaultPingIntervalDays', 'Chu kỳ điểm danh mặc định (ngày)')}
        {numberField('gracePeriodDays', 'Thời gian ân hạn (ngày)')}
        {numberField('warningDaysBeforeGrace', 'Cảnh báo trước khi hết ân hạn (ngày)')}
      </Section>

      <Section title="Chính sách lưu trữ" description="Giới hạn tệp tải lên cho giấy tờ đính kèm.">
        {numberField('maxUploadSizeBytes', 'Dung lượng tải lên tối đa (byte)', {
          labelAside: Number.isFinite(uploadSize) && uploadSize > 0 ? <span className="fs-11 text-slate-400">{formatBytes(uploadSize)}</span> : undefined,
        })}
        <div className="col-12 col-md-6">
          <TextField id="cfg-allowedExtensions" name="allowedExtensions" label="Đuôi tệp được phép" value={form.allowedExtensions} onChange={handleText} error={errors.allowedExtensions} />
        </div>
      </Section>

      <Section title="Chính sách sao lưu" description="Lịch tự động sao lưu dữ liệu và thời gian giữ lại.">
        <div className="col-12 col-md-6 d-flex align-items-end">
          <Form.Check type="checkbox" id="cfg-autoBackupEnabled" name="autoBackupEnabled" label="Tự động sao lưu" checked={form.autoBackupEnabled} onChange={handleCheck} />
        </div>
        <div className="col-12 col-md-6">
          <TextField id="cfg-cronSchedule" name="cronSchedule" label="Lịch sao lưu (cron)" value={form.cronSchedule} onChange={handleText} error={errors.cronSchedule} />
        </div>
        {numberField('retentionDays', 'Số ngày lưu bản sao lưu')}
      </Section>

      {submitError && <Alert variant="danger" className="av-alert mb-0">{submitError}</Alert>}

      <div className="d-flex flex-wrap justify-content-end gap-2">
        <Button type="button" variant="light" className="av-btn av-btn-md border" disabled={!dirty || busy} onClick={handleRevert}>
          <Undo2 size={16} aria-hidden="true" />
          Hoàn tác
        </Button>
        <Button type="submit" variant="primary" className="av-btn av-btn-md" disabled={!dirty || busy}>
          <Save size={16} aria-hidden="true" />
          {busy ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </div>
    </form>
  )
}
