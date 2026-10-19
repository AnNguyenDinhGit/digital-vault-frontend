import { conflictMessage } from './ownerErrors'

// Chuyển lỗi API upload giấy tờ sang thông báo tiếng Việt
export function uploadErrorMessage(error) {
  switch (error?.status) {
    case 400: {
      const base = 'File hoặc chữ ký không hợp lệ. Hãy kiểm tra định dạng, dung lượng và chữ ký rời (RSA-SHA256, tạo bằng chứng thư đã đăng ký).'
      // Kèm nguyên văn lý do từ máy chủ để biết chính xác lỗi (vd chưa đăng ký chứng thư người ký)
      return error.message ? `${base} Chi tiết từ máy chủ: ${error.message}` : base
    }
    case 403:
      return 'Bạn không có quyền tải giấy tờ cho tài sản này.'
    case 404:
      return 'Không tìm thấy tài sản hoặc người thụ hưởng.'
    case 409:
      // Chọn người thụ hưởng chưa được phân bổ thì BE nhắc chọn phân bổ hiện có; các lý do khác (hồ sơ bàn giao, tài sản không hoạt động) giải thích riêng
      return /allocation/i.test(error.message ?? '')
        ? 'Người thụ hưởng này chưa có phân bổ hiện hành trên tài sản. Hãy chỉ định phân bổ trước hoặc để trống ô người thụ hưởng.'
        : conflictMessage(error.message)
    case 413:
      return 'File quá lớn. Mỗi file tối đa 10 MB.'
    case 503:
      return 'Máy chủ chưa cấu hình mã hóa hoặc chứng thư ký. Vui lòng liên hệ quản trị viên.'
    default:
      return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
  }
}
