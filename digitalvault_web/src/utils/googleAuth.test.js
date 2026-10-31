import { googleErrorMessage, isGoogleSessionExpired } from './googleAuth'

describe('googleErrorMessage', () => {
  it('googleErrorMessage_NotConfigured503_TellsUserToContactAdmin', () => {
    expect(googleErrorMessage({ status: 503 })).toContain('chưa được cấu hình')
  })

  it('googleErrorMessage_TooManyRequests_AsksToWaitAMinute', () => {
    expect(googleErrorMessage({ status: 429 })).toContain('1 phút')
  })

  it('googleErrorMessage_RoleNotAllowed403_ExplainsOnlyOwnerAndBeneficiary', () => {
    const message = googleErrorMessage({ status: 403 })
    expect(message).toContain('Chủ sở hữu')
    expect(message).toContain('Người thụ hưởng')
  })

  it('googleErrorMessage_GoogleAccountChanged409_AsksToStartOver', () => {
    expect(googleErrorMessage({ status: 409 })).toContain('đăng nhập lại')
  })

  it('googleErrorMessage_SessionExpiredOrOtherBrowser400_ExplainsSameBrowserRule', () => {
    const message = googleErrorMessage({ status: 400, message: 'Google sign-in expired or belongs to another browser. Start again.' })
    expect(message).toContain('hết hạn')
    expect(message).toContain('cùng trình duyệt')
  })

  it('googleErrorMessage_WrongOtp400AtOtpStep_SaysCodeIsWrongOrExpired', () => {
    expect(googleErrorMessage({ status: 400, message: 'Invalid or expired OTP.' }, 'otp')).toBe('Mã OTP không đúng hoặc đã hết hạn.')
  })

  it('googleErrorMessage_Other400_FallsBackToSessionExpired', () => {
    expect(googleErrorMessage({ status: 400, message: 'x' })).toContain('cùng trình duyệt')
  })

  it('googleErrorMessage_Unauthorized401_SaysAccountUnavailable', () => {
    expect(googleErrorMessage({ status: 401 })).toContain('không khả dụng')
  })

  it('googleErrorMessage_Network0_UsesServerMessage', () => {
    expect(googleErrorMessage({ status: 0, message: 'Không thể kết nối tới máy chủ.' })).toBe('Không thể kết nối tới máy chủ.')
  })

  it('googleErrorMessage_NoErrorInfo_UsesDefault', () => {
    expect(googleErrorMessage(null)).toBe('Đã có lỗi xảy ra, vui lòng thử lại.')
  })
})

describe('isGoogleSessionExpired', () => {
  it('isGoogleSessionExpired_ExpiredOrOtherBrowserMessage_ReturnsTrue', () => {
    expect(isGoogleSessionExpired({ status: 400, message: 'Google sign-in expired or belongs to another browser. Start again.' })).toBe(true)
    expect(isGoogleSessionExpired({ status: 400, message: 'Google authorization expired or belongs to another browser. Start again.' })).toBe(true)
  })

  it('isGoogleSessionExpired_WrongOtpOrOtherStatus_ReturnsFalse', () => {
    expect(isGoogleSessionExpired({ status: 400, message: 'Invalid or expired OTP.' })).toBe(false)
    expect(isGoogleSessionExpired({ status: 500, message: 'expired or belongs' })).toBe(false)
    expect(isGoogleSessionExpired(null)).toBe(false)
  })
})
