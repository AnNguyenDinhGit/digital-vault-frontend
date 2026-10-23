import { declineReasonFromNotifications } from './handover'

// Các thông báo BE gửi cho Owner (tiêu đề tiếng Anh cố định) và cách hiển thị tiếng Việt; tiêu đề lạ giữ nguyên để không mất thông tin
const KNOWN = {
  'Executor accepted handover': { title: 'Executor đã tiếp nhận hồ sơ bàn giao', tone: 'ok' },
  'Executor declined handover': { title: 'Executor đã từ chối hồ sơ bàn giao', tone: 'warn' },
  'Vault assignment revoked': { title: 'Phân công Executor đã bị thu hồi', tone: 'warn' },
  'Vault assigned': { title: 'Kho được giao cho Executor', tone: 'info' },
}

const HANDOVER_NUMBER = /Handover #(\d+)/

// Chuẩn hóa một thông báo: tiêu đề và nội dung tiếng Việt, tông màu, mã hồ sơ liên quan (nếu có) để tạo liên kết
export function describeNotification(notification) {
  const rawTitle = notification.title ?? ''
  const message = notification.message ?? ''
  const known = KNOWN[rawTitle]
  const requestId = HANDOVER_NUMBER.exec(message)?.[1] ?? null
  const base = { requestId: requestId === null ? null : Number(requestId), tone: known?.tone ?? 'info' }

  if (rawTitle === 'Executor declined handover' && base.requestId !== null) {
    const reason = declineReasonFromNotifications([notification], base.requestId)
    return { ...base, title: known.title, body: reason ? `Hồ sơ #${base.requestId} bị từ chối. Lý do: ${reason}` : `Hồ sơ #${base.requestId} bị từ chối.` }
  }
  if (rawTitle === 'Executor accepted handover') return { ...base, title: known.title, body: 'Executor được giao đã tiếp nhận hồ sơ bàn giao của bạn.' }
  if (rawTitle === 'Vault assignment revoked') return { ...base, title: known.title, body: 'Phân công Executor của bạn với kho này đã bị thu hồi.' }
  return { ...base, title: known?.title ?? (rawTitle || 'Thông báo'), body: message }
}

// Số thông báo chưa đọc hiển thị trên huy hiệu: ẩn khi 0, gộp từ 100 trở lên thành 99+
export function formatUnreadCount(count) {
  if (!count) return ''
  return count > 99 ? '99+' : String(count)
}
