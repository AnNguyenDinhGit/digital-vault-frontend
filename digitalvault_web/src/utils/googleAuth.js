const DEFAULT_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại.'
const SESSION_EXPIRED = 'Phiên đăng nhập Google đã hết hạn hoặc thuộc trình duyệt khác. Hãy bắt đầu lại và hoàn tất trong cùng trình duyệt.'

// BE trả 400 khi phiên Google hết hạn hoặc mở ở trình duyệt khác (khác với OTP sai, cũng là 400 nhưng còn thử lại được)
export const isGoogleSessionExpired = (error) => error?.status === 400 && /expired or belongs|another browser/i.test(error.message ?? '')

// Thông báo lỗi tiếng Việt cho các bước đăng nhập Google; step = 'otp' khi đang nhập mã OTP của email mới
export function googleErrorMessage(error, step = 'session') {
  switch (error?.status) {
    case 503:
      return 'Đăng nhập Google chưa được cấu hình trên máy chủ. Vui lòng liên hệ quản trị viên.'
    case 429:
      return 'Bạn thao tác quá nhanh. Vui lòng đợi khoảng 1 phút rồi thử lại.'
    case 403:
      return 'Tài khoản này không được dùng đăng nhập Google (chỉ dành cho Chủ sở hữu và Người thụ hưởng). Vui lòng đăng nhập bằng email và mật khẩu.'
    case 409:
      return 'Tài khoản Google đã thay đổi. Vui lòng đăng nhập lại từ đầu.'
    case 401:
      return 'Tài khoản không khả dụng. Vui lòng liên hệ quản trị viên.'
    case 400:
      // BE dùng cùng mã 400 cho cả OTP sai và phiên hết hạn nên phải đọc lý do để phân biệt
      if (step === 'otp' && !isGoogleSessionExpired(error)) return 'Mã OTP không đúng hoặc đã hết hạn.'
      return SESSION_EXPIRED
    default:
      return error?.message || DEFAULT_ERROR
  }
}
