// Giới hạn độ dài lấy theo DataAnnotations của BE
export const LIMITS = {
  fullName: 100,
  email: 150,
  phone: 20,
  passwordMin: 12,
  passwordMax: 1024,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value)
}

// Validate form đăng nhập, trả về object { field: message } (rỗng nếu hợp lệ)
export function validateLogin({ email, password }) {
  const errors = {}
  const trimmedEmail = email.trim()
  if (!trimmedEmail) errors.email = 'Vui lòng nhập email.'
  else if (!isValidEmail(trimmedEmail)) errors.email = 'Email không hợp lệ.'

  if (!password) errors.password = 'Vui lòng nhập mật khẩu.'
  else if (password.length > LIMITS.passwordMax) errors.password = `Mật khẩu tối đa ${LIMITS.passwordMax} ký tự.`
  return errors
}

const PHONE_PATTERN = /^\+?[0-9][0-9\s]{7,19}$/
const PASSWORD_STRENGTH = /^(?=.*\d)(?=.*[^A-Za-z0-9]).+$/
const PASSWORD_RULE_MESSAGE = `Mật khẩu tối thiểu ${LIMITS.passwordMin} ký tự, có số và ký tự đặc biệt.`

// Validate form đăng ký: giới hạn theo BE, quy tắc số và ký tự đặc biệt theo gợi ý trên thiết kế
export function validateRegister({ fullName, email, phone, password, confirmPassword, acceptTerms }) {
  const errors = {}
  const name = fullName.trim()
  if (!name) errors.fullName = 'Vui lòng nhập họ tên.'
  else if (name.length > LIMITS.fullName) errors.fullName = `Họ tên tối đa ${LIMITS.fullName} ký tự.`

  const mail = email.trim()
  if (!mail) errors.email = 'Vui lòng nhập email.'
  else if (mail.length > LIMITS.email) errors.email = `Email tối đa ${LIMITS.email} ký tự.`
  else if (!isValidEmail(mail)) errors.email = 'Email không hợp lệ.'

  const phoneValue = phone.trim()
  if (!phoneValue) errors.phone = 'Vui lòng nhập số điện thoại.'
  else if (phoneValue.length > LIMITS.phone || !PHONE_PATTERN.test(phoneValue)) errors.phone = 'Số điện thoại không hợp lệ.'

  if (!password) errors.password = 'Vui lòng nhập mật khẩu.'
  else if (password.length < LIMITS.passwordMin || password.length > LIMITS.passwordMax || !PASSWORD_STRENGTH.test(password))
    errors.password = PASSWORD_RULE_MESSAGE

  if (!confirmPassword) errors.confirmPassword = 'Vui lòng nhập lại mật khẩu.'
  else if (confirmPassword !== password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.'

  if (!acceptTerms) errors.acceptTerms = 'Bạn cần đồng ý với Điều khoản dịch vụ.'
  return errors
}
