import { useCallback, useEffect, useMemo, useState } from 'react'
import * as authApi from '../callapi/authApi'
import { setUnauthorizedHandler } from '../callapi/axiosClient'
import { AuthContext, USER_STORAGE_KEY } from './authContextInstance'

// Đọc user đã lưu, trả null nếu không có hoặc dữ liệu hỏng
function readStoredUser() {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearStoredUser() {
  try {
    sessionStorage.removeItem(USER_STORAGE_KEY)
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
}

export function AuthProvider({ children }) {
  const [initialUser] = useState(readStoredUser)
  const [user, setUser] = useState(null)
  const [isChecking, setIsChecking] = useState(initialUser !== null)

  const clearUser = useCallback(() => {
    clearStoredUser()
    setUser(null)
  }, [])

  // Khi F5: xác nhận lại cookie còn hạn trước khi khôi phục user
  useEffect(() => {
    if (!initialUser) return
    let cancelled = false
    authApi
      .checkSession()
      .then((valid) => {
        if (cancelled) return
        if (valid) setUser(initialUser)
        else clearStoredUser()
      })
      .catch(() => {
        // Không kết nối được BE: giữ user, request sau sẽ báo lỗi rõ ràng
        if (!cancelled) setUser(initialUser)
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [initialUser])

  // Phiên hết hạn ở bất kỳ request nào thì xoá user, ProtectedRoute sẽ đưa về trang đăng nhập
  useEffect(() => {
    setUnauthorizedHandler(clearUser)
    return () => setUnauthorizedHandler(null)
  }, [clearUser])

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password)
    // BE chỉ trả userId và roles nên lưu thêm email đã nhập để hiển thị trên giao diện
    const nextUser = { userId: result.userId, roles: result.roles ?? [], email }
    try {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser))
    } catch {
      // Bỏ qua khi trình duyệt chặn storage
    }
    setUser(nextUser)
    return nextUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Vẫn xoá phiên phía FE dù BE lỗi
    } finally {
      clearUser()
    }
  }, [clearUser])

  const hasRole = useCallback((role) => Boolean(user?.roles?.includes(role)), [user])

  const value = useMemo(
    () => ({ user, isChecking, login, logout, hasRole }),
    [user, isChecking, login, logout, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
