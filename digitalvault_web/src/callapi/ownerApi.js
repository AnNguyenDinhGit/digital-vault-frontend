import axiosClient from './axiosClient'

// Mô tả để trống thì gửi null, vì BE coi description là tuỳ chọn
const optionalText = (value) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function getVaults() {
  const { data } = await axiosClient.get('/owner/vaults')
  return data
}

export async function getVault(vaultId) {
  const { data } = await axiosClient.get(`/owner/vaults/${vaultId}`)
  return data
}

// Chỉ gửi đúng các trường BE nhận (BE từ chối trường thừa)
export async function createVault({ name, description }) {
  const { data } = await axiosClient.post('/owner/vaults', {
    name: name.trim(),
    description: optionalText(description),
  })
  return data
}

// BE không xoá tài sản mà chỉ đánh dấu Revoked và vẫn trả trong danh sách, nên ẩn các tài sản đã thu hồi
export async function getAssets() {
  const { data } = await axiosClient.get('/owner/assets')
  return data.filter((asset) => asset.status !== 'Revoked')
}

export async function getAsset(assetId) {
  const { data } = await axiosClient.get(`/owner/assets/${assetId}`)
  return data
}

export async function createAsset({ vaultId, name, type, description }) {
  const { data } = await axiosClient.post('/owner/assets', {
    vaultId,
    name: name.trim(),
    type,
    description: optionalText(description),
  })
  return data
}

// Upload giấy tờ của Owner (multipart): File và Signature (chữ ký rời) bắt buộc, BeneficiaryId tuỳ chọn.
// BE từ chối mọi trường khác; giấy chứng tử do Người thi hành nộp ở hồ sơ bàn giao.
export async function uploadDocument(assetId, { file, signature, beneficiaryId }) {
  const form = new FormData()
  form.append('File', file)
  form.append('Signature', signature)
  if (beneficiaryId) form.append('BeneficiaryId', String(beneficiaryId))
  const { data } = await axiosClient.post(`/owner/assets/${assetId}/documents`, form)
  return data
}

// Nhật ký hoạt động (BE đã ghi AuditLog nhưng chưa có API đọc, đang dùng mock)
export async function getActivityLogs() {
  const { data } = await axiosClient.get('/owner/activity-logs')
  return data
}

// Điểm danh sự sống (BE chưa có API, đang dùng mock): 404 nghĩa là chưa thiết lập
export async function getProofOfLife() {
  const { data } = await axiosClient.get('/owner/proof-of-life')
  return data
}

export async function saveProofOfLife({ frequencyDays, gracePeriodDays }) {
  const { data } = await axiosClient.put('/owner/proof-of-life', {
    frequencyDays: Number(frequencyDays),
    gracePeriodDays: Number(gracePeriodDays),
  })
  return data
}

export async function pingProofOfLife() {
  const { data } = await axiosClient.post('/owner/proof-of-life/ping')
  return data
}

// Chỉ có ở mock: tua nhanh thời gian để xem trạng thái Cảnh báo và Đã kích hoạt
export async function simulateTimePassing(days) {
  const { data } = await axiosClient.post('/owner/proof-of-life/simulate', { days })
  return data
}

// Bỏ assetId để lấy người thụ hưởng trên mọi tài sản của user
export async function getBeneficiaries(assetId) {
  const { data } = await axiosClient.get('/owner/beneficiaries', {
    params: assetId === undefined ? undefined : { assetId },
  })
  // BE giữ cả phân bổ đã thu hồi (Revoked) để lưu lịch sử, giao diện chỉ hiển thị phân bổ đang hiệu lực
  return data.filter((row) => row.status === 'Active')
}

export async function assignBeneficiary(assetId, { email, allocation }) {
  const { data } = await axiosClient.post(`/owner/assets/${assetId}/beneficiaries`, {
    email: email.trim(),
    allocation,
  })
  return data
}

// Người thi hành (BE chưa có API, đang dùng mock): 404 ở getVaultExecutor nghĩa là kho chưa gán
export async function getExecutors() {
  const { data } = await axiosClient.get('/owner/executors')
  return data
}

export async function getVaultExecutor(vaultId) {
  const { data } = await axiosClient.get(`/owner/vaults/${vaultId}/executor`)
  return data
}

export async function assignExecutor(vaultId, executorId) {
  const { data } = await axiosClient.put(`/owner/vaults/${vaultId}/executor`, { executorId: Number(executorId) })
  return data
}

export async function revokeExecutor(vaultId) {
  await axiosClient.delete(`/owner/vaults/${vaultId}/executor`)
}

// Chỉ có ở mock: giả lập Executor chấp nhận lời ủy quyền
export async function simulateExecutorAccept(vaultId) {
  const { data } = await axiosClient.post(`/owner/vaults/${vaultId}/executor/accept`)
  return data
}

// Cài đặt bảo mật (BE chưa có API, đang dùng mock)
export async function getProfile() {
  const { data } = await axiosClient.get('/owner/profile')
  return data
}

// Số điện thoại để trống thì gửi null (xóa số)
export async function updateProfile({ fullName, phone }) {
  const { data } = await axiosClient.put('/owner/profile', { fullName: fullName.trim(), phone: optionalText(phone) })
  return data
}

// Chỉ gửi đúng các trường hợp đồng; mật khẩu không bao giờ được log
export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  await axiosClient.post('/owner/change-password', { currentPassword, newPassword, confirmPassword })
}

export async function setTwoFactor(enabled) {
  const { data } = await axiosClient.put('/owner/security/two-factor', { enabled })
  return data
}

// Sửa tài sản; không gửi vaultId vì tài sản không được chuyển kho
export async function updateAsset(assetId, { name, type, description }) {
  const { data } = await axiosClient.put(`/owner/assets/${assetId}`, {
    name: name.trim(),
    type,
    description: optionalText(description),
  })
  return data
}

// BE không xoá hẳn tài sản mà thu hồi (Status = Revoked), dữ liệu và lịch sử vẫn giữ
export async function revokeAsset(assetId) {
  await axiosClient.post(`/owner/assets/${assetId}/revoke`)
}

// Danh sách phân bổ của một tài sản kèm assignmentId (BeneficiaryDto của /owner/beneficiaries không có id này)
export async function getAllocations(assetId) {
  const { data } = await axiosClient.get(`/owner/assets/${assetId}/allocations`)
  return data
}

// BE sửa/thu hồi phân bổ theo assignmentId nên tra id của phân bổ đang hiệu lực theo người thụ hưởng
async function findActiveAssignment(assetId, beneficiaryId) {
  const assignment = (await getAllocations(assetId)).find((row) => row.beneficiaryId === beneficiaryId && row.status === 'Active')
  if (!assignment) throw Object.assign(new Error('Assignment not found.'), { status: 404 })
  return assignment
}

export async function updateBeneficiaryAllocation(assetId, beneficiaryId, allocation) {
  const { assignmentId } = await findActiveAssignment(assetId, beneficiaryId)
  const { data } = await axiosClient.put(`/owner/assets/${assetId}/allocations/${assignmentId}`, { allocation: Number(allocation) })
  return data
}

// Gỡ người thụ hưởng = thu hồi phân bổ (Status = Revoked), phần trăm trả về chưa phân bổ
export async function removeBeneficiary(assetId, beneficiaryId) {
  const { assignmentId } = await findActiveAssignment(assetId, beneficiaryId)
  await axiosClient.post(`/owner/assets/${assetId}/allocations/${assignmentId}/revoke`)
}

// Tải nội dung giấy tờ (đã giải mã) về dạng Blob
export async function downloadDocument(assetId, documentId) {
  const { data } = await axiosClient.get(`/owner/assets/${assetId}/documents/${documentId}/content`, { responseType: 'blob' })
  return data
}
