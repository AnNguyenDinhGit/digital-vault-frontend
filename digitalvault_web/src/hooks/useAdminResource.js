import { useCallback, useEffect, useState } from 'react'

// Tải một tài nguyên đơn của cổng Admin (không phân trang). `fetcher` phải ổn định (hàm của callapi).
// apply nhận dữ liệu mới (ví dụ kết quả trả về của lệnh PUT/POST) để cập nhật ngay không cần tải lại.
export function useAdminResource(fetcher) {
  const [state, setState] = useState({ data: null, error: '', errorStatus: null, loading: true })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: '', errorStatus: null, loading: false })
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error: error?.message || 'Đã có lỗi xảy ra.', errorStatus: error?.status ?? null, loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [fetcher, reloadKey])

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, error: '', loading: true }))
    setReloadKey((value) => value + 1)
  }, [])
  const apply = useCallback((data) => setState({ data, error: '', errorStatus: null, loading: false }), [])

  return { ...state, reload, apply }
}
