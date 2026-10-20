import { isValidEmail, LIMITS } from './validators'

// Vai trò hệ thống của BE (bảng ROLES) kèm tên hiển thị
export const ROLE_LABELS = {
  Admin: 'Quản trị viên',
  Owner: 'Chủ sở hữu',
  Executor: 'Người thi hành',
  Beneficiary: 'Người thụ hưởng',
  LegalVerifier: 'Người xác minh pháp lý',
}
export const ALL_ROLES = Object.keys(ROLE_LABELS)
export const roleLabel = (role) => ROLE_LABELS[role] ?? role

// Trạng thái tài khoản (USERS.Status) và tông màu hiển thị
const USER_STATUS_INFO = {
  Active: { text: 'Hoạt động', tone: 'ok' },
  Disabled: { text: 'Vô hiệu hóa', tone: 'muted' },
  Locked: { text: 'Bị khóa', tone: 'warn' },
}
export const USER_STATUSES = Object.keys(USER_STATUS_INFO)
export const userStatusInfo = (status) => USER_STATUS_INFO[status] ?? { text: status, tone: 'muted' }

// Thông báo lỗi chung cho các thao tác quản trị người dùng
export function adminErrorMessage(error) {
  if (error?.status === 400) return 'Thông tin không hợp lệ. Vui lòng kiểm tra lại.'
  if (error?.status === 403) return 'Bạn không có quyền Quản trị hệ thống.'
  if (error?.status === 404) return 'Không tìm thấy người dùng. Vui lòng tải lại danh sách.'
  if (error?.status === 409) return 'Email này đã được sử dụng.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

// Validate form tạo người dùng; mật khẩu chỉ cần đủ độ dài như BE
export function validateAdminUser({ fullName, email, password, phone, identityNumber, roles }) {
  const errors = {}
  const name = fullName.trim()
  if (!name) errors.fullName = 'Vui lòng nhập họ tên.'
  else if (name.length > LIMITS.fullName) errors.fullName = `Họ tên tối đa ${LIMITS.fullName} ký tự.`

  const mail = email.trim()
  if (!mail) errors.email = 'Vui lòng nhập email.'
  else if (!isValidEmail(mail) || mail.length > LIMITS.email) errors.email = 'Email không hợp lệ.'

  if (!password) errors.password = 'Vui lòng nhập mật khẩu.'
  else if (password.length < LIMITS.passwordMin) errors.password = `Mật khẩu tối thiểu ${LIMITS.passwordMin} ký tự.`
  else if (password.length > LIMITS.passwordMax) errors.password = `Mật khẩu tối đa ${LIMITS.passwordMax} ký tự.`

  if (phone.trim().length > LIMITS.phone) errors.phone = `Số điện thoại tối đa ${LIMITS.phone} ký tự.`
  if (identityNumber.trim().length > LIMITS.phone) errors.identityNumber = `Số CCCD tối đa ${LIMITS.phone} ký tự.`
  if (roles.length === 0) errors.roles = 'Chọn ít nhất một vai trò.'
  return errors
}
