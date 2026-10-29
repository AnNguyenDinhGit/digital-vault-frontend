// Chữ ký giả lập giữa trang cổng VNPay mock và endpoint return mock; BE thật dùng HMAC-SHA512 nên không thể giả ở FE.
// Tách riêng khỏi paymentHandlers để trang cổng giả lập dùng được mà không kéo msw vào bản build.
export const MOCK_VNPAY_SIGNATURE = 'mock-signature'
