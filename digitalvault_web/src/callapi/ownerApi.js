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

export async function getAssets() {
  const { data } = await axiosClient.get('/owner/assets')
  return data
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
  return data
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

// Sửa và xóa tài sản (BE chưa có API, đang dùng mock); không gửi vaultId vì tài sản không được chuyển kho
export async function updateAsset(assetId, { name, type, description }) {
  const { data } = await axiosClient.put(`/owner/assets/${assetId}`, {
    name: name.trim(),
    type,
    description: optionalText(description),
  })
  return data
}

export async function deleteAsset(assetId) {
  await axiosClient.delete(`/owner/assets/${assetId}`)
}

// Sửa tỷ lệ và gỡ người thụ hưởng khỏi một tài sản (BE chưa có API, đang dùng mock)
export async function updateBeneficiaryAllocation(assetId, beneficiaryId, allocation) {
  const { data } = await axiosClient.put(`/owner/assets/${assetId}/beneficiaries/${beneficiaryId}`, {
    allocation: Number(allocation),
  })
  return data
}

export async function removeBeneficiary(assetId, beneficiaryId) {
  await axiosClient.delete(`/owner/assets/${assetId}/beneficiaries/${beneficiaryId}`)
}

// Tải giấy tờ về dạng Blob (BE chưa có API, đang dùng mock trả nội dung mô phỏng)
export async function downloadDocument(assetId, documentId) {
  const { data } = await axiosClient.get(`/owner/assets/${assetId}/documents/${documentId}/download`, { responseType: 'blob' })
  return data
}
