import axios from 'axios'

// Các method không làm thay đổi dữ liệu thì BE không yêu cầu header chống CSRF
const SAFE_METHODS = ['get', 'head', 'options']

// Lỗi API đã được chuẩn hoá từ response { status, detail } của BE
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let unauthorizedHandler = null

// Đăng ký hàm xử lý khi phiên hết hạn (401), thường là logout và về trang đăng nhập
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  // BE xác thực bằng cookie HttpOnly nên luôn gửi kèm cookie
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

axiosClient.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase()
  if (!SAFE_METHODS.includes(method)) {
    // BE từ chối mọi request thay đổi dữ liệu thiếu header này
    config.headers['X-Vault-Request'] = '1'
  }
  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0
    const detail = error.response?.data?.detail
    const message = detail || (status === 0 ? 'Không thể kết nối tới máy chủ.' : 'Đã có lỗi xảy ra, vui lòng thử lại.')

    if (status === 401 && !error.config?.skipAuthRedirect && unauthorizedHandler) {
      unauthorizedHandler()
    }
    return Promise.reject(new ApiError(status, message))
  },
)

export default axiosClient
