// Chuyển cả trình duyệt sang địa chỉ khác (ví dụ cổng thanh toán VNPay); tách riêng để test thay thế được
export function redirectTo(url) {
  window.location.assign(url)
}
