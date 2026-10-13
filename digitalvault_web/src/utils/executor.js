// Trạng thái lời ủy quyền Executor (bảng ExecutorAssignment của BE, mặc định Pending)
const STATUS_LABELS = { Pending: 'Chờ chấp nhận', Active: 'Đang hiệu lực' }

export function executorStatusLabel(status) {
  return STATUS_LABELS[status] ?? status
}

export const executorBadgeClass = (status) => (status === 'Active' ? 'av-badge-ok' : 'av-badge-info')

// AssetDto của BE không có vaultId nên chỉ đếm được khi người dùng có đúng một kho
export const countVaultAssets = (assetCount, vaultCount) => (vaultCount === 1 ? assetCount : null)

export function executorErrorMessage(error) {
  if (error?.status === 404) return 'Không tìm thấy người thi hành đã chọn.'
  if (error?.status === 400) return 'Yêu cầu không hợp lệ, vui lòng chọn lại người thi hành.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
