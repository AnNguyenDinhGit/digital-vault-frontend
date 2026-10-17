// Trạng thái phân công Executor (bảng ExecutorAssignment của BE); BE không có bước Executor chấp nhận
const STATUS_LABELS = { Active: 'Đang hiệu lực' }

export function executorStatusLabel(status) {
  return STATUS_LABELS[status] ?? status
}

export const executorBadgeClass = (status) => (status === 'Active' ? 'av-badge-ok' : 'av-badge-muted')

// AssetDto của BE không có vaultId nên chỉ đếm được khi người dùng có đúng một kho
export const countVaultAssets = (assetCount, vaultCount) => (vaultCount === 1 ? assetCount : null)

export function executorErrorMessage(error) {
  if (error?.status === 404) return 'Không tìm thấy người thi hành đã chọn.'
  if (error?.status === 403) return 'Bạn không có quyền gán người thi hành cho kho này.'
  if (error?.status === 409) return 'Người thi hành này không khả dụng (cần là Executor đang hoạt động và độc lập với bạn).'
  if (error?.status === 400) return 'Yêu cầu không hợp lệ, vui lòng chọn lại người thi hành.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
