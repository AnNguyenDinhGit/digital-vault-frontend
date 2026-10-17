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
