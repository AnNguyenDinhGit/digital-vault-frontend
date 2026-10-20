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
