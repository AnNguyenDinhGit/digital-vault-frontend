import { useCallback, useEffect, useState } from 'react'
import { getActivityLogs, getProfile } from '../callapi/ownerApi'

const INITIAL_STATE = { status: 'loading', error: '', profile: null, logins: { status: 'loading', items: [] } }
const MAX_LOGINS = 5

// Lịch sử đăng nhập lấy từ nhật ký hoạt động; lỗi ở đây không được làm hỏng cả trang
const fetchLogins = () =>
  getActivityLogs()
    .then((logs) => ({ status: 'ready', items: logs.filter((log) => log.action === 'Login').slice(0, MAX_LOGINS) }))
    .catch(() => ({ status: 'error', items: [] }))

// Hồ sơ, cài đặt bảo mật và vài lần đăng nhập gần nhất của Owner.
// applyProfile nhận kết quả từ lệnh lưu để cập nhật ngay không cần tải lại.
export function useSecuritySettings() {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getProfile(), fetchLogins()])
      .then(([profile, logins]) => {
        if (!cancelled) setState({ status: 'ready', error: '', profile, logins })
      })
      .catch((error) => {
        if (!cancelled) setState({ ...INITIAL_STATE, status: 'error', error: error?.message || 'Đã có lỗi xảy ra.' })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = useCallback(() => {
    setState(INITIAL_STATE)
    setReloadKey((key) => key + 1)
  }, [])

  const applyProfile = useCallback((patch) => setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } })), [])

  return { ...state, reload, applyProfile }
}
