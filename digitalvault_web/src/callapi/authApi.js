import { clearTokens, getTokens, setTokens } from '../utils/tokenStorage'
import { normalizeIdentityNumber } from '../utils/validators'
import axiosClient from './axiosClient'

// Các request xác thực tự xử lý 401 nên không kích hoạt redirect toàn cục
const AUTH_CONFIG = { skipAuthRedirect: true }

// Đăng nhập: BE trả { userId, roles, accessToken, refreshToken, expiresAt }.
// Token được lưu để axiosClient tự gắn Bearer; nơi gọi chỉ nhận userId và roles.
export async function login(email, password) {
  // Bỏ token cũ trước để không gửi kèm token hỏng/của tài khoản khác
  clearTokens()
  const { accessToken, refreshToken, expiresAt, ...user } = (await axiosClient.post('/auth/login', { email, password }, AUTH_CONFIG)).data
  if (accessToken) setTokens({ accessToken, refreshToken, expiresAt })
  return user
}

// Đăng ký tài khoản Owner, chỉ gửi đúng các trường BE nhận (BE từ chối trường thừa)
export async function register({ fullName, email, phone, identityNumber, password, confirmPassword }) {
  const trimmedPhone = phone?.trim()
  const citizenId = normalizeIdentityNumber(identityNumber)
  const { data } = await axiosClient.post(
    '/auth/register',
    {
      fullName,
      email,
      phone: trimmedPhone ? trimmedPhone : null,
      // CCCD tuỳ chọn: chỉ gửi khi có nhập (BE bỏ qua khi thiếu)
      ...(citizenId ? { identityNumber: citizenId } : {}),
      password,
      confirmPassword,
    },
    AUTH_CONFIG,
  )
  return data
}

// Luôn xoá token phía FE dù BE trả lỗi, để người dùng thoát được phiên
export async function logout() {
  try {
    await axiosClient.post('/auth/logout', null, AUTH_CONFIG)
  } finally {
    clearTokens()
  }
}

// BE chưa có endpoint "me": gọi thử một API cần đăng nhập để biết cookie còn hạn không.
// 403 nghĩa là đã đăng nhập nhưng không phải Owner, vẫn là phiên hợp lệ.
export async function checkSession() {
  // Không có token thì chắc chắn chưa đăng nhập, khỏi gọi BE
  if (!getTokens()) return false
  try {
    await axiosClient.get('/owner/vaults', AUTH_CONFIG)
    return true
  } catch (error) {
    if (error.status === 403) return true
    if (error.status === 401) return false
    throw error
  }
}

// Quên mật khẩu (BE chưa có API, đang dùng mock). Ba bước: gửi mã OTP, xác nhận mã, đặt mật khẩu mới.
export async function requestPasswordReset(email) {
  const { data } = await axiosClient.post('/auth/forgot-password', { email: email.trim() }, AUTH_CONFIG)
  return data
}

export async function verifyResetOtp(email, otp) {
  const { data } = await axiosClient.post('/auth/verify-reset-otp', { email: email.trim(), otp: otp.trim() }, AUTH_CONFIG)
  return data
}

// Chỉ gửi đúng các trường hợp đồng; mật khẩu không bao giờ được log
export async function resetPassword({ resetToken, newPassword, confirmPassword }) {
  await axiosClient.post('/auth/reset-password', { resetToken, newPassword, confirmPassword }, AUTH_CONFIG)
}
