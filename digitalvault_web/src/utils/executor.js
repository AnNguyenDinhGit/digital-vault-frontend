// Trạng thái phân công Executor (bảng ExecutorAssignment của BE): Active do Owner chọn, AutoAssigned do hệ thống tự chọn khi tạo hồ sơ,
// Revoked là đã thu hồi (hoặc Executor từ chối hồ sơ)
const STATUS_LABELS = { Active: 'Đang hiệu lực', AutoAssigned: 'Hệ thống tự chọn', Revoked: 'Đã thu hồi' }

export function executorStatusLabel(status) {
  return STATUS_LABELS[status] ?? status
}

export const executorBadgeClass = (status) => (['Active', 'AutoAssigned'].includes(status) ? 'av-badge-ok' : 'av-badge-muted')

// AssetDto của BE không có vaultId nên chỉ đếm được khi người dùng có đúng một kho
export const countVaultAssets = (assetCount, vaultCount) => (vaultCount === 1 ? assetCount : null)

export function executorErrorMessage(error) {
  if (error?.status === 404) return 'Không tìm thấy người thi hành đã chọn.'
  if (error?.status === 403) return 'Bạn không có quyền gán người thi hành cho kho này.'
  if (error?.status === 409) return 'Người thi hành này không khả dụng (cần là Executor đang hoạt động và độc lập với bạn).'
  if (error?.status === 400) return 'Yêu cầu không hợp lệ, vui lòng chọn lại người thi hành.'
  return error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

// Thông báo lỗi khi Owner thu hồi Executor (BE chặn sau khi Executor đã tiếp nhận hoặc đang xử lý hồ sơ)
export function revokeExecutorErrorMessage(error) {
  if (error?.status === 409) return 'Không thu hồi được: Executor đã tiếp nhận hoặc đang xử lý hồ sơ bàn giao của kho này (hoặc kho đã đóng).'
  if (error?.status === 404) return 'Kho này không còn người thi hành đang hiệu lực. Vui lòng tải lại trang.'
  return executorErrorMessage(error)
}

// Tên chủ kho của hồ sơ: BE trả cả ownerName lẫn owner.fullName
export const handoverOwnerName = (handover) => handover?.ownerName ?? handover?.owner?.fullName ?? null

// Nhãn kho: "Kho #17 · Kho gia đình", hoặc "Kho #17" khi chưa có tên
export const vaultLabel = (vaultId, vaultName) => (vaultName ? `Kho #${vaultId} · ${vaultName}` : `Kho #${vaultId}`)

// vaultId -> tên kho, lấy từ danh sách phân công (ExecutorAssignmentDto.vaultName)
export const vaultNamesOf = (assignments) => new Map((assignments ?? []).filter((item) => item.vaultName).map((item) => [item.vaultId, item.vaultName]))

// Tên các tài sản trong hồ sơ (CaseDto.assetName), bỏ trùng và bỏ tên rỗng
export const assetNamesOf = (cases) => [...new Set((cases ?? []).map((item) => item.assetName).filter(Boolean))]
