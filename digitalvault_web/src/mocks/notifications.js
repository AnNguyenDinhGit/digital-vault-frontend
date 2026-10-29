// Thêm thông báo cho một người dùng như bảng NOTIFICATIONS của BE (ManagementService.Notify)
export function notify(db, userId, type, title, message) {
  db.notifications ??= []
  const notificationId = Math.max(0, ...db.notifications.map((item) => item.notificationId)) + 1
  db.notifications.push({ notificationId, userId, type, title, message, isRead: false, createdAt: new Date().toISOString() })
}
