import { LIFE_CONFIRMATION_DEFAULTS, confirmAliveErrorMessage } from './lifeConfirmation'

describe('LIFE_CONFIRMATION_DEFAULTS', () => {
  it('LIFE_CONFIRMATION_DEFAULTS_Always_MatchBackendDefaults', () => {
    expect(LIFE_CONFIRMATION_DEFAULTS).toEqual({ frequencyDays: 30, gracePeriodDays: 14 })
  })
})

describe('confirmAliveErrorMessage', () => {
  it('confirmAliveErrorMessage_Conflict409_ExplainsPendingDeathReportOrLegalRecord', () => {
    expect(confirmAliveErrorMessage({ status: 409 })).toBe(
      'Không thể xác nhận vì hồ sơ bàn giao của bạn đã có giấy chứng tử đang xử lý hoặc đã được duyệt pháp lý.',
    )
  })

  it('confirmAliveErrorMessage_Forbidden403_SaysOwnerOnly', () => {
    expect(confirmAliveErrorMessage({ status: 403 })).toBe('Chỉ chủ kho mới được xác nhận còn sống.')
  })

  it('confirmAliveErrorMessage_Other_UsesServerMessageOrGeneric', () => {
    expect(confirmAliveErrorMessage({ status: 500, message: 'Lỗi.' })).toBe('Lỗi.')
    expect(confirmAliveErrorMessage({})).toBe('Đã có lỗi xảy ra, vui lòng thử lại.')
  })
})
