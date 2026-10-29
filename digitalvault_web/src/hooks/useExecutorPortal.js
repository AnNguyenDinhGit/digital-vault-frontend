import { useCallback, useEffect, useState } from 'react'
import { getAssignments, getHandovers } from '../callapi/executorApi'

const INITIAL_STATE = { status: 'loading', error: '', assignments: [], handovers: [] }

// Kho được phân công và các hồ sơ bàn giao của Executor đang đăng nhập
export function useExecutorPortal() {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getAssignments(), getHandovers()])
      .then(([assignments, handovers]) => {
        if (!cancelled) setState({ status: 'ready', error: '', assignments, handovers })
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

  return { ...state, reload }
}
