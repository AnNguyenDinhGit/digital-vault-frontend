import { useCallback, useEffect, useState } from 'react'
import { getOwnerHandovers } from '../callapi/ownerApi'

const INITIAL_STATE = { status: 'loading', error: '', handovers: [] }

// Hồ sơ bàn giao của các kho của Owner
export function useOwnerHandovers() {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getOwnerHandovers()
      .then((handovers) => {
        if (!cancelled) setState({ status: 'ready', error: '', handovers })
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
