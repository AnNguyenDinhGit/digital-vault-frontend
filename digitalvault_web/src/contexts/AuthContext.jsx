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

function storeUser(user) {
  try {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
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

  // Khi F5: hỏi BE (GET /auth/me) xem token còn hợp lệ không và lấy role/email mới nhất
  useEffect(() => {
    if (!initialUser) return
    let cancelled = false
    authApi
      .checkSession()
      .then((me) => {
        if (cancelled) return
        if (me) {
          const restored = { userId: me.userId, roles: me.roles ?? [], email: me.email }
          storeUser(restored)
          setUser(restored)
        } else clearStoredUser()
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

  // BE chỉ trả userId và roles nên lưu thêm email đã nhập để hiển thị trên giao diện
  const finishLogin = useCallback((result, email) => {
    const nextUser = { userId: result.userId, roles: result.roles ?? [], email }
    storeUser(nextUser)
    setUser(nextUser)
    return nextUser
  }, [])

  // Trả về user khi đăng nhập xong, hoặc thông tin challenge (requiresTwoFactor) khi cần nhập mã hai lớp
  const login = useCallback(
    async (email, password) => {
      const result = await authApi.login(email, password)
      return result.requiresTwoFactor ? result : finishLogin(result, email)
    },
    [finishLogin],
  )

  const verifyTwoFactor = useCallback(
    async (challengeId, code, email) => finishLogin(await authApi.verifyTwoFactor(challengeId, code), email),
    [finishLogin],
  )

  const resendTwoFactor = useCallback((challengeId) => authApi.resendTwoFactor(challengeId), [])

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
    () => ({ user, isChecking, login, verifyTwoFactor, resendTwoFactor, logout, hasRole }),
    [user, isChecking, login, verifyTwoFactor, resendTwoFactor, logout, hasRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
