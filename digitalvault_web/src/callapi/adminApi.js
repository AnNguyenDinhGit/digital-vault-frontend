import axiosClient from './axiosClient'

// API cổng System Admin của BE (role Admin): người dùng và nhật ký kiểm toán. Danh sách trả PageDto { page, pageSize, items }.

// role/status rỗng thì không gửi lên BE (BE bỏ qua bộ lọc khi chuỗi rỗng)
export async function getAdminUsers({ page = 1, pageSize = 20, role = '', status = '' } = {}) {
  const params = { page, pageSize }
  if (role) params.role = role
  if (status) params.status = status
  const { data } = await axiosClient.get('/admin/users', { params })
  return data
}

export async function createAdminUser(input) {
  const { data } = await axiosClient.post('/admin/users', input)
  return data
}

// BE thay toàn bộ danh sách vai trò của người dùng bằng danh sách gửi lên (204)
export async function updateUserRoles(userId, roles) {
  await axiosClient.put(`/admin/users/${userId}/roles`, { roles })
}

// status: Active | Disabled | Locked (204)
export async function updateUserStatus(userId, status) {
  await axiosClient.put(`/admin/users/${userId}/status`, { status })
}

export async function getAuditLogs({ page = 1, pageSize = 20, action = '' } = {}) {
  const params = { page, pageSize }
  if (action) params.action = action
  const { data } = await axiosClient.get('/admin/audit-logs', { params })
  return data
}

// Sửa họ tên, điện thoại, CCCD của người dùng (BE bỏ qua họ tên rỗng, ô điện thoại hoặc CCCD rỗng nghĩa là xóa); trả người dùng sau khi sửa
export async function updateAdminUser(userId, { fullName, phone, identityNumber }) {
  const { data } = await axiosClient.put(`/admin/users/${userId}`, {
    fullName: fullName.trim(),
    phone: phone.trim(),
    identityNumber: identityNumber.trim(),
  })
  return data
}

// Admin đặt lại mật khẩu cho người dùng (BE mở khóa đăng nhập sai và trả { message })
export async function resetUserPassword(userId, newPassword) {
  const { data } = await axiosClient.post(`/admin/users/${userId}/reset-password`, { newPassword })
  return data
}

// Ma trận phân quyền: 5 vai trò, danh mục quyền và số người dùng đang hoạt động của từng vai trò
export async function getAdminRoles() {
  const { data } = await axiosClient.get('/admin/roles')
  return data
}

// Bảng điều khiển cảnh báo an ninh trong 24 giờ qua
export async function getSecurityAlerts() {
  const { data } = await axiosClient.get('/admin/security/alerts')
  return data
}

export async function getSystemConfig() {
  const { data } = await axiosClient.get('/admin/system/config')
  return data
}

// BE thay nguyên cả nhóm tham số được gửi lên (không gộp từng trường) và bỏ qua nhóm bị bỏ trống
export async function updateSystemConfig(input) {
  const { data } = await axiosClient.put('/admin/system/config', input)
  return data
}

export async function getKeyRotation() {
  const { data } = await axiosClient.get('/admin/system/key-rotation')
  return data
}

// Tăng phiên bản (+1) của mọi khóa mã hóa đang hoạt động; trả thống kê sau khi xoay
export async function rotateEncryptionKeys() {
  const { data } = await axiosClient.post('/admin/system/key-rotation/rotate', {})
  return data
}

export async function getIntegrations() {
  const { data } = await axiosClient.get('/admin/integrations')
  return data
}

// Kiểm tra kết nối thời gian thực tới một dịch vụ tích hợp (404 nếu mã dịch vụ không tồn tại)
export async function pingIntegration(serviceId) {
  const { data } = await axiosClient.post(`/admin/integrations/${serviceId}/ping`)
  return data
}
