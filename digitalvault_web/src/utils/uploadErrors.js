// Chuyển lỗi API upload giấy tờ sang thông báo tiếng Việt
export function uploadErrorMessage(error) {
  switch (error?.status) {
    case 400:
      return 'File hoặc chữ ký không hợp lệ. Hãy kiểm tra định dạng, dung lượng và chữ ký rời (RSA-SHA256, tạo bằng chứng thư đã đăng ký).'
    case 403:
      return 'Bạn không có quyền tải giấy tờ cho tài sản này.'
    case 404:
      return 'Không tìm thấy tài sản hoặc người thụ hưởng.'
    case 409:
      return 'Người thụ hưởng không nằm trong danh sách của tài sản này hoặc tài sản chưa sẵn sàng nhận giấy tờ.'
    case 413:
      return 'File quá lớn. Mỗi file tối đa 10 MB.'
    case 503:
      return 'Máy chủ chưa cấu hình mã hóa hoặc chứng thư ký. Vui lòng liên hệ quản trị viên.'
    default:
      return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
  }
}
