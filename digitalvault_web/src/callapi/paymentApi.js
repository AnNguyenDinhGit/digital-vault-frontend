import axiosClient from './axiosClient'

// API thanh toán gói dịch vụ qua VNPay của BE (PaymentController)

// Danh sách gói đang bán (công khai), giá thấp trước; chấp nhận cả mảng thuần và PageDto
export async function getPlans() {
  const { data } = await axiosClient.get('/payments/plans')
  return Array.isArray(data) ? data : (data?.items ?? [])
}

// Gói đang hiệu lực của người dùng đang đăng nhập: CurrentSubscriptionDto { hasActiveSubscription, subscription }
// subscription = UserSubscriptionDto { subscriptionId, status, startDate, endDate, plan: SubscriptionPlanDto }
export async function getMySubscription() {
  const { data } = await axiosClient.get('/payments/me/subscription')
  return data
}

// Lịch sử giao dịch của người dùng đang đăng nhập (PaymentTransactionPageDto { page, pageSize, total, items })
// status tuỳ chọn: Success | Pending | Failed; bỏ trống để lấy tất cả
export async function getMyTransactions({ page = 1, pageSize = 10, status } = {}) {
  const params = { page, pageSize }
  if (status) params.status = status
  const { data } = await axiosClient.get('/payments/me/transactions', { params })
  return { page: data?.page ?? page, pageSize: data?.pageSize ?? pageSize, total: data?.total ?? 0, items: data?.items ?? [] }
}

// Tạo giao dịch chờ thanh toán và nhận paymentUrl để chuyển trình duyệt sang VNPay (BE trả 503 khi chưa cấu hình VNPay)
export async function createVnpayCheckout(planId) {
  const { data } = await axiosClient.post('/payments/vnpay/checkout', { planId })
  return data
}

// Chuyển nguyên các tham số vnp_* VNPay gửi về cho BE kiểm tra chữ ký và số tiền; BE trả { transactionCode, status, amount }
export async function confirmVnpayReturn(params) {
  const { data } = await axiosClient.get('/payments/vnpay/return', { params })
  return data
}
