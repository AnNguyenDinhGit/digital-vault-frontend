import { useEffect, useState } from 'react'
import { getNotificationPage } from '../callapi/ownerApi'

// Sự kiện phát ra khi thông báo thay đổi (đánh dấu đã đọc) để huy hiệu ở thanh bên cập nhật ngay
export const NOTIFICATIONS_CHANGED_EVENT = 'aeterna:notifications-changed'

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
}

// Số thông báo chưa đọc trong 100 thông báo mới nhất (BE chưa có API đếm). Lỗi mạng hoặc máy chủ chỉ làm số về 0, không làm hỏng giao diện.
export function useUnreadNotifications() {
  const [count, setCount] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const reload = () => setReloadKey((value) => value + 1)
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, reload)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, reload)
  }, [])

  useEffect(() => {
    let cancelled = false
    getNotificationPage({ page: 1, pageSize: 100 })
      .then((data) => {
        if (!cancelled) setCount((data.items ?? []).filter((item) => !item.isRead).length)
      })
      .catch(() => {
        if (!cancelled) setCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return count
}
