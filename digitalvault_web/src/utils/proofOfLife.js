const DAY = 24 * 60 * 60 * 1000

export const PROOF_OF_LIFE_DEFAULTS = { frequencyDays: 30, gracePeriodDays: 7 }
export const FREQUENCY_PRESETS = [7, 14, 30, 60, 90]
export const GRACE_PRESETS = [3, 7, 14, 30]
const LIMITS = { frequencyMax: 365, graceMax: 90 }

const STATUS_LABELS = { Active: 'Đang hoạt động', Warning: 'Cảnh báo', Triggered: 'Đã kích hoạt' }

export function proofOfLifeStatusLabel(status) {
  return STATUS_LABELS[status] ?? status
}

// Trạng thái suy ra từ thời gian: trong hạn là Active, quá hạn nhưng còn ân hạn là Warning, hết ân hạn là Triggered
export function computeProofOfLife({ frequencyDays, gracePeriodDays, lastPingAt }, now = new Date()) {
  const nextPingDue = new Date(new Date(lastPingAt).getTime() + frequencyDays * DAY)
  const graceEndsAt = new Date(nextPingDue.getTime() + gracePeriodDays * DAY)
  let status = 'Active'
  if (now > graceEndsAt) status = 'Triggered'
  else if (now > nextPingDue) status = 'Warning'
  return {
    status,
    nextPingDue: nextPingDue.toISOString(),
    graceEndsAt: graceEndsAt.toISOString(),
    daysUntilDue: Math.ceil((nextPingDue - now) / DAY),
    daysUntilTrigger: Math.ceil((graceEndsAt - now) / DAY),
  }
}

// Số ngày còn lại (làm tròn lên) tính từ bây giờ đến một mốc; âm nghĩa là đã qua mốc
export function daysFromNow(iso, now = new Date()) {
  return Math.ceil((new Date(iso) - now) / DAY)
}

const INVALID_MESSAGE = 'Chu kỳ hoặc thời gian ân hạn phải là số nguyên dương từ 1 ngày trở lên.'

function parsePositiveInteger(value) {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return null
  const number = Number(text)
  return number >= 1 ? number : null
}

// Validate form cấu hình điểm danh, trả về { field: message } (rỗng nếu hợp lệ)
export function validateProofOfLife({ frequencyDays, gracePeriodDays }) {
  const errors = {}
  const frequency = parsePositiveInteger(frequencyDays)
  const grace = parsePositiveInteger(gracePeriodDays)
  if (frequency === null) errors.frequencyDays = INVALID_MESSAGE
  else if (frequency > LIMITS.frequencyMax) errors.frequencyDays = `Chu kỳ tối đa ${LIMITS.frequencyMax} ngày.`
  if (grace === null) errors.gracePeriodDays = INVALID_MESSAGE
  else if (grace > LIMITS.graceMax) errors.gracePeriodDays = `Thời gian ân hạn tối đa ${LIMITS.graceMax} ngày.`
  return errors
}

export function describeCycle(frequencyDays, gracePeriodDays) {
  return `Nếu bạn không điểm danh trong ${frequencyDays} ngày, hệ thống gửi email cảnh báo. Sau thêm ${gracePeriodDays} ngày ân hạn (tổng ${frequencyDays + gracePeriodDays} ngày), quy trình bàn giao sẽ được kích hoạt.`
}

const pad = (value) => String(value).padStart(2, '0')

// Định dạng theo giờ địa phương: 13/10/2026
export function formatDate(iso) {
  const date = new Date(iso)
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

// 13/10/2026 09:05
export function formatDateTime(iso) {
  const date = new Date(iso)
  return `${formatDate(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
