import { checkoutErrorMessage, formatDuration, formatStorage, formatVnd, paymentStatusInfo, returnErrorMessage, vnpayParams } from './payment'

describe('formatVnd', () => {
  it('formatVnd_Amounts_UsesDotThousandsSeparatorAndDongSign', () => {
    expect(formatVnd(199000)).toBe('199.000 ₫')
    expect(formatVnd(1500000)).toBe('1.500.000 ₫')
    expect(formatVnd(500)).toBe('500 ₫')
  })

  it('formatVnd_Zero_ReturnsZeroDong', () => {
    expect(formatVnd(0)).toBe('0 ₫')
  })

  it('formatVnd_Decimal_RoundsToWholeDong', () => {
    expect(formatVnd(1999.6)).toBe('2.000 ₫')
  })
})

describe('formatStorage', () => {
  it('formatStorage_Sizes_ReturnsHumanReadableVietnamese', () => {
    expect(formatStorage(1073741824)).toBe('1 GB')
    expect(formatStorage(5368709120)).toBe('5 GB')
    expect(formatStorage(1610612736)).toBe('1,5 GB')
    expect(formatStorage(52428800)).toBe('50 MB')
    expect(formatStorage(2048)).toBe('2 KB')
    expect(formatStorage(100)).toBe('100 B')
  })
})

describe('formatDuration', () => {
  it('formatDuration_Days_ConvertsWholeMonthsAndYears', () => {
    expect(formatDuration(30)).toBe('1 tháng')
    expect(formatDuration(90)).toBe('3 tháng')
    expect(formatDuration(365)).toBe('1 năm')
    expect(formatDuration(730)).toBe('2 năm')
    expect(formatDuration(45)).toBe('45 ngày')
  })
})

describe('paymentStatusInfo', () => {
  it('paymentStatusInfo_KnownStatuses_ReturnVietnameseTextAndTone', () => {
    expect(paymentStatusInfo('Success')).toEqual({ text: 'Thanh toán thành công', tone: 'ok' })
    expect(paymentStatusInfo('Failed')).toEqual({ text: 'Thanh toán thất bại', tone: 'warn' })
    expect(paymentStatusInfo('Pending')).toEqual({ text: 'Đang chờ xác nhận', tone: 'caution' })
  })

  it('paymentStatusInfo_Unknown_KeepsRawText', () => {
    expect(paymentStatusInfo('Refunded')).toEqual({ text: 'Refunded', tone: 'muted' })
  })
})

describe('vnpayParams', () => {
  it('vnpayParams_MixedQuery_KeepsOnlyVnpParameters', () => {
    const search = new URLSearchParams('vnp_TxnRef=T1&vnp_Amount=19900000&foo=bar&vnp_SecureHash=abc')
    expect(vnpayParams(search)).toEqual({ vnp_TxnRef: 'T1', vnp_Amount: '19900000', vnp_SecureHash: 'abc' })
  })

  it('vnpayParams_NoVnpParameters_ReturnsEmptyObject', () => {
    expect(vnpayParams(new URLSearchParams('a=1'))).toEqual({})
  })
})

describe('checkoutErrorMessage', () => {
  it('checkoutErrorMessage_KnownStatuses_ReturnVietnameseMessages', () => {
    expect(checkoutErrorMessage({ status: 401 })).toContain('đăng nhập')
    expect(checkoutErrorMessage({ status: 404 })).toContain('không còn khả dụng')
    expect(checkoutErrorMessage({ status: 400 })).toContain('chưa thể thanh toán')
    expect(checkoutErrorMessage({ status: 503 })).toContain('chưa được cấu hình')
  })

  it('checkoutErrorMessage_Other_UsesServerMessageOrDefault', () => {
    expect(checkoutErrorMessage({ status: 500, message: 'Máy chủ bận.' })).toBe('Máy chủ bận.')
    expect(checkoutErrorMessage({})).toBe('Đã có lỗi xảy ra, vui lòng thử lại.')
  })
})

describe('returnErrorMessage', () => {
  it('returnErrorMessage_KnownStatuses_ReturnVietnameseMessages', () => {
    expect(returnErrorMessage({ status: 400 })).toContain('Không xác thực được')
    expect(returnErrorMessage({ status: 404 })).toContain('Không tìm thấy giao dịch')
    expect(returnErrorMessage({ status: 409 })).toContain('kết quả khác')
    expect(returnErrorMessage({ status: 503 })).toContain('chưa được cấu hình')
  })

  it('returnErrorMessage_Other_UsesServerMessageOrDefault', () => {
    expect(returnErrorMessage({ status: 500, message: 'Máy chủ bận.' })).toBe('Máy chủ bận.')
    expect(returnErrorMessage(null)).toBe('Đã có lỗi xảy ra, vui lòng thử lại.')
  })
})
