import axios from 'axios'
import { clearTokens } from '../utils/tokenStorage'
import { loginResultFromResponse } from './authApi'
import { ApiError } from './axiosClient'

// Đăng nhập Google của BE dùng cookie tạm đặt ở MIỀN CỦA BE (HttpOnly, Secure, SameSite=None, 10 phút, gắn với trình duyệt đã bắt đầu).
// Vì vậy mọi bước đều phải đi thẳng tới địa chỉ tuyệt đối của BE và gửi kèm cookie, không đi qua /api của FE (Vite proxy hoặc rewrite của Vercel),
// nếu không cookie sẽ nằm ở miền khác và BE không nhận ra phiên.
export const GOOGLE_API_BASE_URL = (import.meta.env.VITE_GOOGLE_API_BASE_URL || 'https://vault-owner-be.huydevops.id.vn/api').replace(/\/$/, '')

const googleClient = axios.create({
  baseURL: GOOGLE_API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: { Accept: 'application/json' },
})

googleClient.interceptors.request.use((config) => {
  // BE từ chối request thay đổi dữ liệu thiếu header này (chống CSRF cho cookie phiên Google)
  if ((config.method || 'get').toLowerCase() !== 'get') config.headers['X-Vault-Request'] = '1'
  return config
})

// Chuẩn hoá lỗi như axiosClient chính: { status, detail } của BE thành ApiError
googleClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0
    const detail = error.response?.data?.detail
    const message = detail || (status === 0 ? 'Không thể kết nối tới máy chủ.' : 'Đã có lỗi xảy ra, vui lòng thử lại.')
    return Promise.reject(new ApiError(status, message))
  },
)

// Địa chỉ bắt đầu đăng nhập Google: phải chuyển cả trình duyệt tới đây (không gọi bằng axios vì BE trả lệnh chuyển hướng sang Google)
export const googleStartUrl = () => `${GOOGLE_API_BASE_URL}/auth/google/start`

// Tình trạng phiên Google sau khi Google quay về: { challengeId, expiresAt, requiresOtp }
// requiresOtp = false là email đã có tài khoản, true là email mới (BE đã gửi OTP về email đó)
export async function getGoogleChallenge() {
  const { data } = await googleClient.get('/auth/google/challenge')
  return data
}

// Hoàn tất cho email đã có tài khoản: 200 là token, 202 là cần xác thực hai lớp (giống đăng nhập mật khẩu)
export async function completeGoogleLogin(challengeId) {
  // Bỏ token cũ để không lẫn với tài khoản khác
  clearTokens()
  const { data } = await googleClient.post('/auth/google/complete', { challengeId })
  return loginResultFromResponse(data)
}

// Email mới: nhập OTP 6 số BE gửi về; đúng thì BE tạo tài khoản Owner rồi trả token (hoặc 202 nếu cần hai lớp)
export async function verifyGoogleOtp(challengeId, code) {
  clearTokens()
  const { data } = await googleClient.post('/auth/google/otp/verify', { challengeId, code: code.trim() })
  return loginResultFromResponse(data)
}

// Gửi lại OTP (BE chờ 60 giây giữa hai lần) và trả challenge mới thay cho challenge cũ
export async function resendGoogleOtp(challengeId) {
  const { data } = await googleClient.post('/auth/google/otp/resend', { challengeId })
  return data
}
