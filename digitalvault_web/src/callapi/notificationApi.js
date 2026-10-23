import axiosClient from './axiosClient'
import { getAllPages } from './pagedList'

// API thông báo của BE (mọi role đã đăng nhập): NotificationDto { notificationId, type, title, message, isRead, createdAt }

// Sự kiện trên window để icon Hộp thư và trang Thông báo đồng bộ với nhau khi đánh dấu đã đọc
export const NOTIFICATIONS_CHANGED_EVENT = 'aeterna:notifications-changed'

export function emitNotificationsChanged() {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
}

// Một trang thông báo (dùng cho icon Hộp thư: chỉ cần các thông báo mới nhất)
export async function getNotifications({ page = 1, pageSize = 20 } = {}) {
    const { data } = await axiosClient.get('/notifications', { params: { page, pageSize } })
    return Array.isArray(data) ? data : (data?.items ?? [])
}

// Toàn bộ thông báo (trang Hộp thư)
export async function getAllNotifications() {
    return getAllPages('/notifications')
}

export async function markNotificationRead(notificationId) {
    await axiosClient.post(`/notifications/${notificationId}/read`)
}

// BE chưa có API đánh dấu tất cả: gọi lần lượt cho từng thông báo chưa đọc, trả số thông báo đánh dấu thành công
export async function markNotificationsRead(notificationIds) {
    const results = await Promise.allSettled(notificationIds.map((id) => markNotificationRead(id)))
    return results.filter((result) => result.status === 'fulfilled').length
}
