import { useCallback, useEffect, useState } from 'react'
import { getLifeConfirmation } from '../callapi/ownerApi'

const INITIAL_STATE = { status: 'loading', data: null, error: '' }

// Lần xác nhận còn sống gần nhất của Owner: data = { ownerId, lastConfirmedAliveAt } (thời gian là null khi chưa xác nhận lần nào).
// apply nhận kết quả của lần bấm xác nhận để cập nhật ngay không cần tải lại.
export function useProofOfLife() {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getLifeConfirmation()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', data: null, error: error?.message || 'Đã có lỗi xảy ra.' })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = useCallback(() => {
    setState(INITIAL_STATE)
    setReloadKey((key) => key + 1)
  }, [])

  const apply = useCallback((data) => setState({ status: 'ready', data, error: '' }), [])

  return { ...state, reload, apply }
}
