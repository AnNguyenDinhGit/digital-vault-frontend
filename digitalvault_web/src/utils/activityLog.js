import { normalizeText } from './catalog'
import { formatDateTime } from './proofOfLife'

// Nhãn tiếng Việt cho mã thao tác trong AuditLog (mã lạ giữ nguyên để không mất thông tin)
const ACTION_LABELS = {
  Login: 'Đăng nhập',
  Logout: 'Đăng xuất',
  CreateVault: 'Tạo kho',
  CreateAsset: 'Tạo tài sản',
  UpdateAsset: 'Chỉnh sửa tài sản',
  DeleteAsset: 'Xóa tài sản',
  RevokeAsset: 'Thu hồi tài sản',
  AssignBeneficiary: 'Chỉ định người thụ hưởng',
  UpdateAllocation: 'Sửa phân bổ người thụ hưởng',
  RemoveBeneficiary: 'Xóa người thụ hưởng',
  UploadAssetDocument: 'Tải lên giấy tờ',
  DownloadDocument: 'Tải giấy tờ về',
  UpdateProofOfLife: 'Cập nhật cấu hình điểm danh',
  PingProofOfLife: 'Điểm danh sự sống',
  AssignExecutor: 'Gán người thi hành',
  RevokeExecutor: 'Thu hồi người thi hành',
  UpdateProfile: 'Cập nhật thông tin cá nhân',
  ChangePassword: 'Đổi mật khẩu',
  ToggleTwoFactor: 'Đổi cài đặt xác thực hai lớp',
  CreateHandoverRequest: 'Tạo đơn bàn giao',
  RequestLegalVerification: 'Gửi xác minh pháp lý',
  CompleteHandover: 'Hoàn tất bàn giao',
  AdminCreateUser: 'Admin tạo người dùng',
  UpdateUserRoles: 'Admin đổi vai trò người dùng',
  UpdateUserStatus: 'Admin đổi trạng thái người dùng',
}

// Danh sách mã thao tác đã biết, dùng cho ô lọc của Admin (BE lọc đúng theo mã, không có API liệt kê)
export const KNOWN_ACTIONS = Object.keys(ACTION_LABELS)

const ENTITY_LABELS = {
  User: 'Tài khoản',
  DigitalVault: 'Kho',
  DigitalAsset: 'Tài sản',
  HandoverRequest: 'Đơn bàn giao',
}

const RESULT_INFO = {
  Success: { text: 'Thành công', tone: 'ok' },
  Failed: { text: 'Thất bại', tone: 'warn' },
  Alive_Signed: { text: 'Đã ký số', tone: 'ok' },
  Pending_Legal: { text: 'Chờ pháp lý', tone: 'info' },
}

export function actionLabel(action) {
  return ACTION_LABELS[action] ?? action
}

export function entityLabel(type, id) {
  if (!type) return '—'
  const name = ENTITY_LABELS[type] ?? type
  return id === null || id === undefined ? name : `${name} #${id}`
}

export function resultInfo(result) {
  return RESULT_INFO[result] ?? { text: result, tone: 'muted' }
}

// Các thao tác có trong nhật ký, sắp theo nhãn tiếng Việt, dùng cho ô lọc
export function getActionOptions(logs) {
  const codes = [...new Set(logs.map((log) => log.action))]
  return codes
    .map((value) => ({ value, label: actionLabel(value) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'))
}

// Lọc ở FE vì BE chưa có tìm kiếm: theo thao tác, kết quả, khoảng ngày (theo giờ địa phương) và từ khóa
export function filterLogs(logs, { query, action, result, from, to }) {
  const needle = normalizeText(query.trim())
  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : null
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : null
  return logs.filter((log) => {
    if (action !== 'all' && log.action !== action) return false
    if (result === 'Failed' && log.result !== 'Failed') return false
    if (result === 'Success' && log.result === 'Failed') return false
    const time = new Date(log.timestamp).getTime()
    if (fromTime !== null && time < fromTime) return false
    if (toTime !== null && time > toTime) return false
    if (!needle) return true
    const haystack = [actionLabel(log.action), entityLabel(log.entityType, log.entityId), log.ipAddress, resultInfo(log.result).text]
    return haystack.some((text) => normalizeText(text ?? '').includes(needle))
  })
}

const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

// CSV có BOM UTF-8 để Excel hiển thị đúng tiếng Việt
export function buildCsv(logs) {
  const header = ['Thời gian', 'Thao tác', 'Đối tượng', 'Địa chỉ IP', 'Kết quả'].map(quote).join(',')
  const rows = logs.map((log) =>
    [
      formatDateTime(log.timestamp),
      actionLabel(log.action),
      entityLabel(log.entityType, log.entityId),
      log.ipAddress,
      resultInfo(log.result).text,
    ]
      .map(quote)
      .join(','),
  )
  return `\uFEFF${[header, ...rows].join('\r\n')}`
}
