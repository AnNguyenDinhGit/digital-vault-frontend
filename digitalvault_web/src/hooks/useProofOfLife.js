import { useCallback, useEffect, useState } from 'react'
import { getProofOfLife } from '../callapi/ownerApi'

const INITIAL_STATE = { status: 'loading', data: null, error: '' }

// Cấu hình điểm danh của Owner. data = null nghĩa là chưa thiết lập (BE trả 404).
// apply nhận kết quả từ lệnh lưu/điểm danh để cập nhật ngay không cần tải lại.
export function useProofOfLife() {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getProofOfLife()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (cancelled) return
        if (error?.status === 404) setState({ status: 'ready', data: null, error: '' })
        else setState({ status: 'error', data: null, error: error?.message || 'Đã có lỗi xảy ra.' })
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
