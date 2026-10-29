import { useCallback, useEffect, useState } from 'react'
import { getLegalHandover } from '../callapi/legalApi'

const INITIAL_STATE = { status: 'loading', error: null, handover: null }

/**
 * Hook tải chi tiết một hồ sơ thẩm định pháp lý theo requestId
 * @param {number|string} requestId
 */
export function useLegalHandoverDetail(requestId) {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getLegalHandover(requestId)
      .then((data) => {
        if (!cancelled) {
          setState({
            status: 'success',
            error: null,
            handover: data,
          })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: 'error',
            error,
            handover: null,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestId, reloadKey])

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1)
  }, [])

  return {
    status: state.status,
    error: state.error,
    handover: state.handover,
    reload,
  }
}
