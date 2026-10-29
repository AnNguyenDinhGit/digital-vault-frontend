// Chu kỳ và thời gian ân hạn mặc định của BE (bảng PROOF_OF_LIFE); BE chưa có API để đổi nên chỉ hiển thị
export const LIFE_CONFIRMATION_DEFAULTS = { frequencyDays: 30, gracePeriodDays: 14 }

// Thông báo lỗi tiếng Việt khi bấm "Tôi vẫn còn sống"
export function confirmAliveErrorMessage(error) {
  if (error?.status === 409) {
    return 'Không thể xác nhận vì hồ sơ bàn giao của bạn đã có giấy chứng tử đang xử lý hoặc đã được duyệt pháp lý.'
  }
  if (error?.status === 403) return 'Chỉ chủ kho mới được xác nhận còn sống.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
