import { parseServerDate } from './beneficiary'

// Số tiền VND làm tròn đến đồng, ngăn cách hàng nghìn bằng dấu chấm
export function formatVnd(amount) {
  return `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`
}

// Dung lượng dễ đọc theo tiếng Việt (dấu phẩy thập phân)
export function formatStorage(bytes) {
  const fmt = (value) => String(Math.round(value * 10) / 10).replace('.', ',')
  if (bytes >= 1024 ** 3) return `${fmt(bytes / 1024 ** 3)} GB`
  if (bytes >= 1024 ** 2) return `${fmt(bytes / 1024 ** 2)} MB`
  if (bytes >= 1024) return `${fmt(bytes / 1024)} KB`
  return `${bytes} B`
}

// Thời hạn gói: quy đổi sang năm hoặc tháng khi chia hết, còn lại giữ số ngày
export function formatDuration(days) {
  if (days >= 365 && days % 365 === 0) return `${days / 365} năm`
  if (days >= 30 && days % 30 === 0) return `${days / 30} tháng`
  return `${days} ngày`
}

// Trạng thái giao dịch của BE (PaymentTransaction.Status) và tông màu huy hiệu
const PAYMENT_STATUS_INFO = {
  Success: { text: 'Thanh toán thành công', tone: 'ok' },
  Failed: { text: 'Thanh toán thất bại', tone: 'warn' },
  Pending: { text: 'Đang chờ xác nhận', tone: 'caution' },
}
export const paymentStatusInfo = (status) => PAYMENT_STATUS_INFO[status] ?? { text: status, tone: 'muted' }

// Bộ lọc trạng thái của lịch sử giao dịch (giá trị gửi lên BE qua ?status=)
export const PAYMENT_STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'Success', label: 'Thành công' },
  { value: 'Pending', label: 'Đang chờ' },
  { value: 'Failed', label: 'Thất bại' },
]

// Trạng thái gói của người dùng (UserSubscription.Status); giá trị lạ giữ nguyên để không mất thông tin
const SUBSCRIPTION_STATUS_INFO = {
  Active: { text: 'Đang hiệu lực', tone: 'ok' },
  Expired: { text: 'Đã hết hạn', tone: 'muted' },
  Cancelled: { text: 'Đã hủy', tone: 'muted' },
  Pending: { text: 'Chờ kích hoạt', tone: 'caution' },
}
export const subscriptionStatusInfo = (status) => SUBSCRIPTION_STATUS_INFO[status] ?? { text: status || 'Không rõ', tone: 'muted' }

// Gói giá 0 là gói mặc định: BE không tạo giao dịch VNPay cho gói này
export const isFreePlan = (plan) => !(Number(plan?.price) > 0)

export const formatPlanPrice = (plan) => (isFreePlan(plan) ? 'Miễn phí' : formatVnd(plan.price))

const DAY_MS = 24 * 60 * 60 * 1000

// Số ngày còn lại (làm tròn lên, không âm) tới ngày hết hạn gói
export function daysLeft(endDate, now = Date.now()) {
  const end = parseServerDate(endDate).getTime()
  if (Number.isNaN(end)) return 0
  return Math.max(0, Math.ceil((end - now) / DAY_MS))
}

// Ngày hết hạn dự kiến nếu kích hoạt gói ngay bây giờ (BE tính chính xác khi thanh toán thành công)
export function estimatedEndDate(durationDays, now = Date.now()) {
  return new Date(now + durationDays * DAY_MS)
}

// Phần trăm thời hạn đã dùng của gói (0-100), dùng cho thanh tiến độ
export function usedPercent(startDate, endDate, now = Date.now()) {
  const start = parseServerDate(startDate).getTime()
  const end = parseServerDate(endDate).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 100
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
}

// Ngày theo giờ địa phương (dd/mm/yyyy), chấp nhận chuỗi giờ UTC không kèm múi giờ của BE
export function formatPaymentDate(value) {
  const date = parseServerDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatPaymentDateTime(value) {
  const date = parseServerDate(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Chỉ giữ các tham số vnp_* VNPay gửi về; BE kiểm tra chữ ký trên đúng tập này nên không được sửa hay bỏ bớt
export function vnpayParams(searchParams) {
  const result = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith('vnp_')) result[key] = value
  })
  return result
}

const DEFAULT_ERROR = 'Đã có lỗi xảy ra, vui lòng thử lại.'
const NOT_CONFIGURED = 'Cổng thanh toán VNPay chưa được cấu hình. Vui lòng liên hệ quản trị viên.'

// Lỗi khi bấm thanh toán một gói
export function checkoutErrorMessage(error) {
  switch (error?.status) {
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    case 404:
      return 'Gói dịch vụ không còn khả dụng. Vui lòng tải lại trang.'
    case 400:
      return 'Gói dịch vụ này chưa thể thanh toán (giá chưa hợp lệ).'
    case 503:
      return NOT_CONFIGURED
    default:
      return error?.message || DEFAULT_ERROR
  }
}

// Lỗi khi xác thực kết quả VNPay trả về
export function returnErrorMessage(error) {
  switch (error?.status) {
    case 400:
      return 'Không xác thực được kết quả thanh toán (chữ ký hoặc dữ liệu không hợp lệ).'
    case 404:
      return 'Không tìm thấy giao dịch thanh toán này.'
    case 409:
      return 'Giao dịch đã có kết quả khác với thông báo này, vui lòng kiểm tra lại với quản trị viên.'
    case 503:
      return NOT_CONFIGURED
    default:
      return error?.message || DEFAULT_ERROR
  }
}

// Nút hành động trên thẻ gói, tùy gói đang dùng: chưa có gói thì Mua, cùng gói thì Gia hạn, gói đắt hơn thì Nâng cấp, rẻ hơn thì Chuyển gói.
// Gói miễn phí không mua được nên trả null.
export function planAction(plan, currentPlan) {
  if (isFreePlan(plan)) return null
  if (!currentPlan || isFreePlan(currentPlan)) return { label: 'Mua gói', primary: true }
  if (currentPlan.planId === plan.planId) return { label: 'Gia hạn gói', primary: false }
  if (Number(plan.price) > Number(currentPlan.price)) return { label: 'Nâng cấp', primary: true }
  return { label: 'Chuyển gói', primary: false }
}

// Phương thức thanh toán theo thiết kế. BE hiện chỉ có API VNPay (/payments/vnpay/*), các phương thức khác hiển thị nhưng chưa chọn được.
export const PAYMENT_METHODS = [
  { value: 'VNPay', label: 'Cổng thanh toán VNPay', description: 'Thẻ ATM nội địa, Internet Banking, thẻ quốc tế hoặc quét mã VNPAY-QR.', available: true },
  { value: 'MoMo', label: 'Ví MoMo', description: 'Thanh toán bằng ví điện tử MoMo.', available: false },
  { value: 'BankTransfer', label: 'Chuyển khoản ngân hàng', description: 'Chuyển khoản theo số tài khoản và nội dung đối soát.', available: false },
]
