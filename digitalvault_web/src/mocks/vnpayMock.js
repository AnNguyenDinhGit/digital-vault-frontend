// Chữ ký giả lập giữa trang cổng VNPay mock và endpoint return mock; BE thật dùng HMAC-SHA512 nên không thể giả ở FE.
// Tách riêng khỏi paymentHandlers để trang cổng giả lập dùng được mà không kéo msw vào bản build.
export const MOCK_VNPAY_SIGNATURE = 'mock-signature'

// Dữ liệu thử cho trang cổng VNPay giả lập, lấy theo bộ thẻ test của VNPay sandbox (ngân hàng NCB)
export const MOCK_VNPAY_OTP = '123456'
export const MOCK_VNPAY_TIMEOUT_MS = 15 * 60 * 1000
export const MOCK_VNPAY_DOMESTIC_CARDS = [
  { bank: 'NCB', number: '9704198526191432198', holder: 'NGUYEN VAN A', issueDate: '07/15', result: 'ok', note: 'Thanh toán thành công' },
  { bank: 'NCB', number: '9704195798459170488', holder: 'NGUYEN VAN A', issueDate: '07/15', result: 'insufficient', note: 'Không đủ số dư' },
]

// Mã phản hồi VNPay (vnp_ResponseCode) dùng khi trả khách về trang kết quả; lỗi thì vnp_TransactionStatus = 02
export const VNPAY_CODES = { success: '00', expired: '11', wrongOtp: '13', cancelled: '24', insufficient: '51' }
