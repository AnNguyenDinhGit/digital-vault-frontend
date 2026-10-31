import { formatStorage } from './payment'

// Nhận diện lỗi 409 do hạn mức của gói dịch vụ (SubscriptionQuotaService của BE) theo nội dung `detail`; không phải lỗi hạn mức thì trả null
export function parseQuotaError(detail = '') {
  const text = detail ?? ''
  const vault = /vault limit reached \((\d+)\)/i.exec(text)
  if (vault) return { type: 'vault', maxVaults: Number(vault[1]) }
  const storage = /storage limit exceeded\. used (\d+) bytes; limit is (\d+) bytes/i.exec(text)
  if (storage) return { type: 'storage', usedBytes: Number(storage[1]), limitBytes: Number(storage[2]) }
  if (/storage limit exceeded/i.test(text)) return { type: 'storage', usedBytes: null, limitBytes: null }
  if (/exceeds the supported quota range/i.test(text)) return { type: 'range' }
  return null
}

// Thông báo tiếng Việt cho lỗi hạn mức. forOwner = false là Người thi hành nộp giấy tờ: dung lượng tính vào gói của chủ kho nên họ chỉ có thể nhờ chủ kho nâng cấp
export function quotaMessage(quota, { forOwner = true } = {}) {
  switch (quota.type) {
    case 'vault':
      return `Bạn đã dùng hết số kho của gói hiện tại (tối đa ${quota.maxVaults} kho đang hoạt động). Hãy nâng cấp gói ở mục "Gói dịch vụ" hoặc đóng bớt một kho đang hoạt động.`
    case 'storage': {
      if (!forOwner) return 'Dung lượng lưu trữ của chủ kho đã đầy nên chưa nộp thêm được giấy tờ. Hãy báo chủ kho nâng cấp gói dịch vụ rồi thử lại.'
      const usage = quota.usedBytes === null ? '' : ` (đã dùng ${formatStorage(quota.usedBytes)} trên ${formatStorage(quota.limitBytes)})`
      return `Dung lượng lưu trữ của gói đã đầy${usage}. Hãy nâng cấp gói ở mục "Gói dịch vụ" hoặc thu hồi bớt giấy tờ không còn cần.`
    }
    default:
      return 'Dung lượng đã lưu vượt quá phạm vi hệ thống hỗ trợ. Vui lòng liên hệ quản trị viên.'
  }
}
