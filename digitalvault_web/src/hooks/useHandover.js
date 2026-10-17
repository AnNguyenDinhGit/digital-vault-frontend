import { useCallback, useEffect, useState } from 'react'
import { getHandover } from '../callapi/executorApi'

const INITIAL_STATE = { status: 'loading', error: null, handover: null }

// Một hồ sơ bàn giao; refresh tải lại ngầm, giữ nguyên dữ liệu cũ trên màn hình trong lúc tải
export function useHandover(requestId) {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getHandover(requestId)
      .then((handover) => {
        if (!cancelled) setState({ status: 'ready', error: null, handover })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', error, handover: null })
      })
    return () => {
      cancelled = true
    }
  }, [requestId, reloadKey])

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  return { ...state, refresh }
}
