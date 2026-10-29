import { useCallback, useEffect, useState } from 'react'
import { getActivityLogs } from '../callapi/ownerApi'

const INITIAL_STATE = { status: 'loading', error: '', logs: [] }

// Nhật ký hoạt động của Owner (mới nhất trước, do API sắp sẵn)
export function useActivityLogs() {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getActivityLogs()
      .then((logs) => {
        if (!cancelled) setState({ status: 'ready', error: '', logs })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', error: error?.message || 'Đã có lỗi xảy ra.', logs: [] })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = useCallback(() => {
    setState(INITIAL_STATE)
    setReloadKey((key) => key + 1)
  }, [])

  return { ...state, reload }
}
