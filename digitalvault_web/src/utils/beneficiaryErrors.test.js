import { assignErrorMessage } from './beneficiaryErrors'

describe('assignErrorMessage', () => {
  it('assignErrorMessage_AlreadyPendingOrActive409_ExplainsWaitingForConfirmation', () => {
    const message = assignErrorMessage({ status: 409, message: 'This user is already a pending or active beneficiary of the asset.' })
    expect(message).toContain('đã được chỉ định')
    expect(message).toContain('chờ xác nhận')
  })

  it('assignErrorMessage_TotalExceeds409_ExplainsActiveTotalLimit', () => {
    expect(assignErrorMessage({ status: 409, message: 'Total active beneficiary allocation cannot exceed 100 percent.' })).toBe(
      'Tổng tỷ lệ của những người thụ hưởng đang hiệu lực không được vượt 100%.',
    )
  })

  it('assignErrorMessage_HandoverLock409_PointsToHandoverPage', () => {
    expect(assignErrorMessage({ status: 409, message: 'Handover records protect this vault from mutation.' })).toContain('hồ sơ bàn giao')
  })

  it('assignErrorMessage_InactiveAsset409_SaysNotActive', () => {
    expect(assignErrorMessage({ status: 409, message: 'Vault or asset is not active.' })).toBe('Kho hoặc tài sản không còn hoạt động nên không thể thay đổi.')
  })

  it('assignErrorMessage_NotFound404_AsksRecipientToRegister', () => {
    expect(assignErrorMessage({ status: 404 })).toBe('Không tìm thấy tài khoản đang hoạt động với email này. Hãy nhờ người nhận đăng ký trước.')
  })

  it('assignErrorMessage_SelfAssign400_Explains', () => {
    expect(assignErrorMessage({ status: 400 })).toBe('Thông tin không hợp lệ (bạn không thể chọn chính mình làm người thụ hưởng).')
  })

  it('assignErrorMessage_Other_UsesServerMessage', () => {
    expect(assignErrorMessage({ status: 500, message: 'Lỗi.' })).toBe('Lỗi.')
    expect(assignErrorMessage({})).toBe('Đã có lỗi xảy ra, vui lòng thử lại.')
  })
})
