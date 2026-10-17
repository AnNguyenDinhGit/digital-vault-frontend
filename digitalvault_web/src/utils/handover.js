// Trạng thái hồ sơ bàn giao (HANDOVER_REQUESTS của BE) và tông màu hiển thị
const STATUS_INFO = {
  Draft: { text: 'Bản nháp', tone: 'muted' },
  Cancelled: { text: 'Đã hủy', tone: 'muted' },
  Pending_Legal: { text: 'Chờ thẩm định pháp lý', tone: 'info' },
  Additional_Info: { text: 'Cần bổ sung hồ sơ', tone: 'warn' },
  Rejected: { text: 'Bị từ chối', tone: 'warn' },
  Approved: { text: 'Đã duyệt pháp lý', tone: 'ok' },
  In_Progress: { text: 'Đang bàn giao', tone: 'info' },
  Completed: { text: 'Hoàn tất', tone: 'ok' },
}

export function handoverStatusInfo(status) {
  return STATUS_INFO[status] ?? { text: status, tone: 'muted' }
}

// Chỉ ở các trạng thái này Executor mới được nộp thêm giấy chứng tử/bằng chứng và gửi thẩm định
export const isEditableStatus = (status) => ['Draft', 'Rejected', 'Additional_Info'].includes(status)

// Nhóm trạng thái cho từng mục trên thanh điều hướng của Executor
export const HANDOVER_GROUPS = {
  pending: ['Pending_Legal', 'Additional_Info'],
  approved: ['Approved'],
  inProgress: ['In_Progress'],
  history: ['Completed', 'Cancelled'],
}

// Lọc theo nhóm trạng thái (không truyền thì lấy tất cả), mới nhất trước
export function filterHandovers(handovers, statuses) {
  const items = statuses ? handovers.filter((item) => statuses.includes(item.status)) : [...handovers]
  return items.sort((a, b) => b.requestId - a.requestId)
}

// Chuyển lỗi tạo hồ sơ bàn giao sang thông báo tiếng Việt
export function createHandoverErrorMessage(error) {
  if (error?.status === 409) return 'Kho này đã có hồ sơ bàn giao đang xử lý hoặc chưa có tài sản nào được phân bổ.'
  if (error?.status === 403) return 'Bạn không được phân công kho này.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

const SERVER_DETAIL = (error) => (error?.message ? ` Chi tiết từ máy chủ: ${error.message}` : '')

// Thông báo lỗi tiếng Việt cho từng thao tác của Người thi hành trên hồ sơ (kèm nguyên văn lý do của máy chủ khi hữu ích)
export function handoverActionErrorMessage(error, action) {
  const status = error?.status
  if (status === 404) return 'Không tìm thấy hồ sơ bàn giao.'
  if (status === 403) return 'Bạn không có quyền xử lý hồ sơ này.'
  if (status === 413) return 'File quá lớn. Mỗi file tối đa 10 MB.'
  if (action === 'upload') {
    if (status === 400) return `Tệp hoặc chữ ký không hợp lệ.${SERVER_DETAIL(error)}`
    if (status === 409) return 'Hồ sơ không còn ở trạng thái cho phép nộp thêm giấy tờ.'
  }
  if (action === 'legal') {
    if (status === 400) {
      return `Không gửi được hồ sơ. Hãy kiểm tra đã nộp giấy chứng tử, bằng chứng hợp lệ và người xác minh độc lập (không phải bạn, chủ kho hay người thụ hưởng).${SERVER_DETAIL(error)}`
    }
    if (status === 409) return 'Hồ sơ không ở trạng thái cho phép gửi thẩm định.'
  }
  if (action === 'start' && status === 409) return 'Hồ sơ chưa ở trạng thái phù hợp để bắt đầu bàn giao (cần được duyệt pháp lý).'
  if (action === 'complete') {
    if (status === 400) {
      return `Biên bản hoặc chữ ký không hợp lệ. Hãy kiểm tra chữ ký rời RSA-SHA256 và chứng thư đã đăng ký.${SERVER_DETAIL(error)}`
    }
    if (status === 409) return 'Hồ sơ chưa đủ điều kiện để hoàn tất (cần được duyệt pháp lý).'
  }
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
