export const PORTAL_STORAGE_KEY = 'aeterna.portal'

// Cổng (vai trò) người dùng đã chọn gần nhất trong phiên này; sessionStorage nên đóng tab là mất
export function getPortalPreference() {
  try {
    return sessionStorage.getItem(PORTAL_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setPortalPreference(role) {
  try {
    sessionStorage.setItem(PORTAL_STORAGE_KEY, role)
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
}

export function clearPortalPreference() {
  try {
    sessionStorage.removeItem(PORTAL_STORAGE_KEY)
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
}
