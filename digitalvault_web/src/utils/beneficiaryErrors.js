// Chuyển lỗi API chỉ định người thụ hưởng sang thông báo tiếng Việt (dùng chung cho các form chỉ định)
export function assignErrorMessage(error) {
  if (error?.status === 404) return 'Không tìm thấy tài khoản đang hoạt động với email này.'
  if (error?.status === 400) return 'Thông tin không hợp lệ (bạn không thể chọn chính mình làm người thụ hưởng).'
  if (error?.status === 409) return 'Người này đã được chỉ định hoặc tổng phân bổ vượt 100%.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
