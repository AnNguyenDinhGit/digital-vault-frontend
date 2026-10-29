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
