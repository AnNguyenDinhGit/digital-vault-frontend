import { useCallback, useEffect, useState } from 'react'

// Tải một trang danh sách phân trang từ API Admin. `params` phải ổn định theo giá trị (dùng JSON làm khóa);
// trong lúc đổi trang/bộ lọc vẫn giữ dữ liệu cũ và báo `loading`, lỗi thì giữ lại để hiển thị.
export function useAdminList(fetchPage, params) {
  const key = JSON.stringify(params)
  const [state, setState] = useState({ key: null, items: [], error: '' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchPage(JSON.parse(key))
      .then((data) => {
        if (!cancelled) setState({ key, items: data.items ?? [], error: '' })
      })
      .catch((error) => {
        if (!cancelled) setState({ key, items: [], error: error?.message || 'Đã có lỗi xảy ra.' })
      })
    return () => {
      cancelled = true
    }
  }, [fetchPage, key, reloadKey])

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])

  return { items: state.items, error: state.error, loading: state.key !== key, reload }
}
