export const TOKEN_STORAGE_KEY = 'aeterna.tokens'

// Token JWT được giữ trong sessionStorage: đóng tab là mất, và không bị chia sẻ giữa các tab như localStorage.
// Cấu trúc: { accessToken, refreshToken, expiresAt }
export function getTokens() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(TOKEN_STORAGE_KEY))
    return typeof stored?.accessToken === 'string' ? stored : null
  } catch {
    return null
  }
}

// Gộp với giá trị đang có để cập nhật từng phần (vd chỉ đổi accessToken)
export function setTokens(tokens) {
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ ...getTokens(), ...tokens }))
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
}

export function clearTokens() {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
}
