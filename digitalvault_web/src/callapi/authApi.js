import axiosClient from './axiosClient'

// Các request xác thực tự xử lý 401 nên không kích hoạt redirect toàn cục
const AUTH_CONFIG = { skipAuthRedirect: true }

// Đăng nhập, BE trả về { userId, roles } và set cookie phiên
export async function login(email, password) {
  const { data } = await axiosClient.post('/auth/login', { email, password }, AUTH_CONFIG)
  return data
}

// Đăng ký tài khoản Owner, chỉ gửi đúng các trường BE nhận (BE từ chối trường thừa)
export async function register({ fullName, email, phone, password, confirmPassword }) {
  const trimmedPhone = phone?.trim()
  const { data } = await axiosClient.post(
    '/auth/register',
    {
      fullName,
      email,
      phone: trimmedPhone ? trimmedPhone : null,
      password,
      confirmPassword,
    },
    AUTH_CONFIG,
  )
  return data
}

export async function logout() {
  await axiosClient.post('/auth/logout', null, AUTH_CONFIG)
}

// BE chưa có endpoint "me": gọi thử một API cần đăng nhập để biết cookie còn hạn không.
// 403 nghĩa là đã đăng nhập nhưng không phải Owner, vẫn là phiên hợp lệ.
export async function checkSession() {
  try {
    await axiosClient.get('/owner/vaults', AUTH_CONFIG)
    return true
  } catch (error) {
    if (error.status === 403) return true
    if (error.status === 401) return false
    throw error
  }
}
