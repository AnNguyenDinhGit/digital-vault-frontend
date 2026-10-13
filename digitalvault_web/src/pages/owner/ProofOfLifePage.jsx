import { CalendarClock, Clock, HeartPulse, ShieldAlert } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { useSearchParams } from 'react-router-dom'
import { pingProofOfLife, saveProofOfLife, simulateTimePassing } from '../../callapi/ownerApi'
import AppToast from '../../components/common/AppToast'
import ConnectionError from '../../components/common/ConnectionError'
import MockNotice from '../../components/common/MockNotice'
import TextField from '../../components/common/TextField'
import PingConfirmModal from '../../components/owner/PingConfirmModal'
import { useProofOfLife } from '../../hooks/useProofOfLife'
import { MOCK_MODE } from '../../mocks/mode'
import {
  FREQUENCY_PRESETS,
  GRACE_PRESETS,
  PROOF_OF_LIFE_DEFAULTS,
  daysFromNow,
  describeCycle,
  formatDate,
  formatDateTime,
  proofOfLifeStatusLabel,
  validateProofOfLife,
} from '../../utils/proofOfLife'

const BADGE_CLASS = { Active: 'av-badge-ok', Warning: 'av-badge-warn', Triggered: 'av-badge-warn' }
const SIMULATION_STEPS = [7, 30, 40]
const DEFAULT_FORM = {
  frequencyDays: String(PROOF_OF_LIFE_DEFAULTS.frequencyDays),
  gracePeriodDays: String(PROOF_OF_LIFE_DEFAULTS.gracePeriodDays),
}

function saveErrorMessage(error) {
  if (error?.status === 400) return 'Cấu hình không hợp lệ. Chu kỳ và thời gian ân hạn phải là số nguyên dương.'
  if (error?.status === 409) return 'Quy trình bàn giao đã được kích hoạt, không thể sửa cấu hình.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

function pingErrorMessage(error) {
  if (error?.status === 404) return 'Bạn chưa thiết lập điểm danh sự sống.'
  if (error?.status === 409) return 'Quy trình bàn giao đã được kích hoạt, không thể điểm danh.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

// Lỗi mất kết nối (status 0) được tách riêng với lỗi do máy chủ trả về
const toActionError = (error, toMessage) =>
  error?.status === 0 ? { network: true } : { network: false, message: toMessage(error) }

function StatBox({ label, children }) {
  return (
    <div role="group" aria-label={label} className="av-stat">
      <div style={{ minWidth: 0 }}>
        <p className="av-stat-label">{label}</p>
        {children}
      </div>
    </div>
  )
}

function PresetRow({ label, presets, current, disabled, onPick }) {
  return (
    <div role="group" aria-label={label} className="av-tabs mt-2">
      {presets.map((days) => (
        <button
          key={days}
          type="button"
          className="av-tab"
          aria-pressed={Number(current) === days}
          disabled={disabled}
          onClick={() => onPick(days)}
        >
          {`${days} ngày`}
        </button>
      ))}
    </div>
  )
}

function ProofOfLifeContent({ data, apply, mockMode, autoPing }) {
  const triggered = data?.status === 'Triggered'
  const [form, setForm] = useState(() =>
    data ? { frequencyDays: String(data.frequencyDays), gracePeriodDays: String(data.gracePeriodDays) } : DEFAULT_FORM,
  )
  const [errors, setErrors] = useState({})
  const [save, setSave] = useState({ busy: false, error: null })
  const [ping, setPing] = useState({ busy: false, error: null })
  const [pingOpen, setPingOpen] = useState(Boolean(autoPing && data && !triggered))
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const setValue = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const frequency = Number(form.frequencyDays)
  const grace = Number(form.gracePeriodDays)
  const hasValidNumbers = Number.isInteger(frequency) && frequency >= 1 && Number.isInteger(grace) && grace >= 1

  const handleSave = async (event) => {
    event?.preventDefault()
    const nextErrors = validateProofOfLife(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSave({ busy: true, error: null })
    try {
      const result = await saveProofOfLife(form)
      apply(result)
      setSave({ busy: false, error: null })
      setToast({
        title: 'Cập nhật cấu hình thành công!',
        detail: `Chu kỳ mới: ${result.frequencyDays} ngày • Thời gian ân hạn: ${result.gracePeriodDays} ngày (Tổng ${result.frequencyDays + result.gracePeriodDays} ngày)`,
      })
    } catch (error) {
      setSave({ busy: false, error: toActionError(error, saveErrorMessage) })
    }
  }

  const handlePing = async () => {
    setPing({ busy: true, error: null })
    try {
      const result = await pingProofOfLife()
      apply(result)
      setPing({ busy: false, error: null })
      setPingOpen(false)
      setToast({ title: 'Điểm danh thành công!', detail: `Đã gia hạn bộ đếm thêm ${result.frequencyDays} ngày` })
    } catch (error) {
      setPing({ busy: false, error: toActionError(error, pingErrorMessage) })
    }
  }

  const closePing = () => {
    if (ping.busy) return
    setPingOpen(false)
    setPing({ busy: false, error: null })
  }

  const handleSimulate = async (days) => {
    apply(await simulateTimePassing(days))
  }

  const dueDays = data ? daysFromNow(data.nextPingDue) : 0
  const graceEndsAt = data ? new Date(new Date(data.nextPingDue).getTime() + data.gracePeriodDays * 86400000).toISOString() : null
  const triggerDays = data ? daysFromNow(graceEndsAt) : 0

  const milestones = data
    ? [
        { key: 'last', label: 'Điểm danh gần nhất', value: formatDateTime(data.lastPingAt) },
        { key: 'due', label: 'Hạn điểm danh', value: formatDate(data.nextPingDue) },
        { key: 'warn', label: 'Cảnh báo qua email', value: `Từ ${formatDate(data.nextPingDue)}` },
        { key: 'end', label: 'Hết ân hạn: kích hoạt bàn giao', value: formatDate(graceEndsAt) },
      ]
    : []
  const currentMilestone = { Active: 'last', Warning: 'warn', Triggered: 'end' }[data?.status]

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <HeartPulse size={20} aria-hidden="true" />
          </span>
          <div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <h1 className="mb-0 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
                Điểm danh sự sống
              </h1>
              {data && <span className={`av-badge ${BADGE_CLASS[data.status] ?? 'av-badge-muted'}`}>{proofOfLifeStatusLabel(data.status)}</span>}
            </div>
            <p className="mt-1 mb-0 fs-12 text-slate-500">
              Cơ chế Dead Man&apos;s Switch: định kỳ xác nhận bạn vẫn an toàn để kho di sản không bị kích hoạt bàn giao.
            </p>
          </div>
        </div>
        {data && (
          <Button type="button" variant="primary" className="av-btn av-btn-sm" disabled={triggered} onClick={() => setPingOpen(true)}>
            <HeartPulse size={16} aria-hidden="true" />
            Tôi vẫn ổn - Điểm danh ngay
          </Button>
        )}
      </section>

      <MockNotice mode={mockMode} />

      {!data && <p className="av-notice">Bạn chưa thiết lập điểm danh sự sống.</p>}

      {triggered && (
        <Alert variant="danger" className="av-alert d-flex gap-2 align-items-start">
          <ShieldAlert size={18} aria-hidden="true" className="flex-shrink-0 mt-1" />
          <div>
            <p className="mb-1 fw-bold">Quy trình bàn giao đã được kích hoạt</p>
            <p className="mb-0">
              Cấu hình điểm danh đã bị khóa. Executor sẽ được thông báo; việc mở tài sản vẫn cần giấy chứng tử và xác minh pháp lý.
            </p>
          </div>
        </Alert>
      )}

      {data && (
        <div className="av-stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <StatBox label="LẦN ĐIỂM DANH GẦN NHẤT">
            <p className="mb-0 mt-1 av-stat-value" style={{ fontSize: 18 }}>{formatDateTime(data.lastPingAt)}</p>
          </StatBox>
          <StatBox label="HẠN ĐIỂM DANH TIẾP THEO">
            <p className="mb-0 mt-1 av-stat-value" style={{ fontSize: 18 }}>{formatDate(data.nextPingDue)}</p>
            {data.status === 'Active' && <p className="mb-0 mt-1 fs-12 text-brand">{`Còn ${dueDays} ngày`}</p>}
            {data.status === 'Warning' && (
              <>
                <p className="mb-0 mt-1 fs-12 fw-semibold" style={{ color: '#d97706' }}>{`Quá hạn ${Math.abs(dueDays)} ngày`}</p>
                <p className="mb-0 fs-12 text-slate-500">{`Còn ${triggerDays} ngày ân hạn`}</p>
              </>
            )}
            {triggered && <p className="mb-0 mt-1 fs-12 fw-semibold" style={{ color: '#b91c1c' }}>Đã quá hạn ân hạn</p>}
          </StatBox>
          <StatBox label="SỐ LẦN BỎ LỠ">
            <p className="mb-0 mt-1">
              <span className="av-stat-value">{data.missedCount}</span>
              <span className="av-stat-unit">lần</span>
            </p>
          </StatBox>
        </div>
      )}

      <section className="av-panel" aria-labelledby="pol-config-title">
        <h2 id="pol-config-title" className="mb-3 fw-bold text-ink" style={{ fontSize: 16 }}>
          Cấu hình chu kỳ
        </h2>
        <form onSubmit={handleSave} noValidate className="d-flex flex-column gap-4">
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <TextField
                id="pol-frequency"
                name="frequencyDays"
                type="number"
                min="1"
                label="Chu kỳ điểm danh (ngày)"
                required
                labelAside={<span className="fs-11 text-slate-400">Bắt buộc số nguyên ≥ 1</span>}
                rightSlot={<span className="fs-12 text-slate-400 pe-2">ngày</span>}
                disabled={triggered}
                value={form.frequencyDays}
                onChange={(event) => setValue('frequencyDays', event.target.value)}
                error={errors.frequencyDays}
              />
              <PresetRow
                label="Chọn nhanh chu kỳ"
                presets={FREQUENCY_PRESETS}
                current={form.frequencyDays}
                disabled={triggered}
                onPick={(days) => setValue('frequencyDays', String(days))}
              />
            </div>
            <div className="col-12 col-lg-6">
              <TextField
                id="pol-grace"
                name="gracePeriodDays"
                type="number"
                min="1"
                label="Thời gian ân hạn (ngày)"
                required
                labelAside={<span className="fs-11 text-slate-400">Bắt buộc số nguyên ≥ 1</span>}
                rightSlot={<span className="fs-12 text-slate-400 pe-2">ngày</span>}
                disabled={triggered}
                value={form.gracePeriodDays}
                onChange={(event) => setValue('gracePeriodDays', event.target.value)}
                error={errors.gracePeriodDays}
              />
              <PresetRow
                label="Chọn nhanh thời gian ân hạn"
                presets={GRACE_PRESETS}
                current={form.gracePeriodDays}
                disabled={triggered}
                onPick={(days) => setValue('gracePeriodDays', String(days))}
              />
            </div>
          </div>

          <p className="mb-0 fs-13 text-slate-600 av-info-box" style={{ lineHeight: 1.6 }}>
            {hasValidNumbers ? describeCycle(frequency, grace) : 'Nhập chu kỳ và thời gian ân hạn hợp lệ để xem tóm tắt.'}
          </p>

          {save.busy && (
            <p className="mb-0 d-flex align-items-center gap-2 fs-12 text-slate-500">
              <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
              Đang đồng bộ cấu hình lên máy chủ...
            </p>
          )}
          {save.error?.network && (
            <ConnectionError
              title="Không thể kết nối đến máy chủ điểm danh"
              message="Lần lưu này chưa được ghi nhận. Vui lòng kiểm tra đường truyền rồi thử lại."
              onRetry={handleSave}
              disabled={save.busy}
            />
          )}
          {save.error && !save.error.network && <Alert variant="danger" className="av-alert mb-0">{save.error.message}</Alert>}

          <div className="d-flex flex-wrap gap-2">
            <Button type="submit" variant="primary" className="av-btn av-btn-md" disabled={triggered || save.busy}>
              {save.busy ? 'Đang xử lý dữ liệu...' : 'Lưu cấu hình'}
            </Button>
            <Button
              type="button"
              variant="light"
              className="av-btn av-btn-md border"
              disabled={triggered || save.busy}
              onClick={() => {
                setForm(DEFAULT_FORM)
                setErrors({})
              }}
            >
              Khôi phục mặc định
            </Button>
          </div>
        </form>
      </section>

      {data && (
        <section className="av-panel" aria-labelledby="pol-timeline-title">
          <h2 id="pol-timeline-title" className="mb-3 fw-bold text-ink d-flex align-items-center gap-2" style={{ fontSize: 16 }}>
            <CalendarClock size={16} aria-hidden="true" />
            Các mốc thời gian
          </h2>
          <ol className="av-timeline" aria-label="Các mốc điểm danh">
            {milestones.map((item) => (
              <li key={item.key} className={item.key === currentMilestone ? 'is-current' : undefined}>
                <p className="av-timeline-label">{item.label}</p>
                <p className="mb-0 fs-12 text-slate-500">{item.value}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="av-panel" aria-labelledby="pol-info-title">
        <h2 id="pol-info-title" className="mb-2 fw-bold text-ink d-flex align-items-center gap-2" style={{ fontSize: 16 }}>
          <Clock size={16} aria-hidden="true" />
          Điều gì xảy ra khi được kích hoạt?
        </h2>
        <ul className="mb-0 fs-13 text-slate-600" style={{ lineHeight: 1.7 }}>
          <li>Digital Executor được thông báo và bắt đầu quy trình bàn giao.</li>
          <li>Vẫn cần giấy chứng tử và xác minh pháp lý trước khi tài sản được mở.</li>
          <li>Bạn có thể điểm danh để hủy bỏ trước khi hết thời gian ân hạn.</li>
        </ul>
      </section>

      {data && mockMode !== 'off' && (
        <section className="av-panel" aria-labelledby="pol-sim-title">
          <h2 id="pol-sim-title" className="mb-1 fw-bold text-ink" style={{ fontSize: 16 }}>
            Mô phỏng thời gian
          </h2>
          <p className="mb-3 fs-12 text-slate-500">Chỉ có ở chế độ mô phỏng: tua nhanh thời gian để xem các trạng thái Cảnh báo và Đã kích hoạt.</p>
          <div className="d-flex flex-wrap gap-2">
            {SIMULATION_STEPS.map((days) => (
              <button key={days} type="button" className="av-ghost-btn" onClick={() => handleSimulate(days)}>
                {`+${days} ngày`}
              </button>
            ))}
          </div>
        </section>
      )}

      <PingConfirmModal open={pingOpen} isSubmitting={ping.busy} error={ping.error} onConfirm={handlePing} onClose={closePing} />
      <AppToast show={Boolean(toast)} onClose={closeToast} title={toast?.title} detail={toast?.detail} />
    </div>
  )
}

// Trang "Điểm danh sự sống": xem trạng thái, cấu hình chu kỳ và điểm danh
export default function ProofOfLifePage({ mockMode = MOCK_MODE }) {
  const { status, data, error, reload, apply } = useProofOfLife()
  const [searchParams] = useSearchParams()

  if (status === 'loading') {
    return (
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang tải cấu hình điểm danh...
      </p>
    )
  }

  if (status === 'error') {
    return (
      <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3">
        <span>{error}</span>
        <Button type="button" variant="light" size="sm" className="border" onClick={reload}>
          Thử lại
        </Button>
      </Alert>
    )
  }

  return <ProofOfLifeContent data={data} apply={apply} mockMode={mockMode} autoPing={searchParams.get('ping') === '1'} />
}
