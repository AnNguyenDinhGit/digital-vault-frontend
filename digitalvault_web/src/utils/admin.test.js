import { adminErrorMessage, roleLabel, userStatusInfo, validateAdminUser } from './admin'

const valid = { fullName: 'Phạm Thu Hà', email: 'ha@example.com', password: 'MatKhau@12345', phone: '', identityNumber: '', roles: ['Owner'] }

describe('validateAdminUser', () => {
  it('validateAdminUser_ValidInput_ReturnsNoErrors', () => {
    expect(validateAdminUser(valid)).toEqual({})
  })

  it('validateAdminUser_EmptyForm_RequiresNameEmailPasswordAndRole', () => {
    const errors = validateAdminUser({ ...valid, fullName: ' ', email: '', password: '', roles: [] })
    expect(errors).toEqual({
      fullName: 'Vui lòng nhập họ tên.',
      email: 'Vui lòng nhập email.',
      password: 'Vui lòng nhập mật khẩu.',
      roles: 'Chọn ít nhất một vai trò.',
    })
  })

  it('validateAdminUser_BadEmail_ReturnsEmailError', () => {
    expect(validateAdminUser({ ...valid, email: 'abc' }).email).toBe('Email không hợp lệ.')
  })

  it('validateAdminUser_ShortPassword_ReturnsMinLengthError', () => {
    expect(validateAdminUser({ ...valid, password: 'ngan' }).password).toBe('Mật khẩu tối thiểu 12 ký tự.')
  })

  it('validateAdminUser_TooLongPhoneAndIdentity_ReturnsErrors', () => {
    const errors = validateAdminUser({ ...valid, phone: '1'.repeat(21), identityNumber: '2'.repeat(21) })
    expect(errors.phone).toBeDefined()
    expect(errors.identityNumber).toBeDefined()
  })
})

describe('labels', () => {
  it('roleLabel_KnownAndUnknown_ReturnsVietnameseOrRaw', () => {
    expect(roleLabel('LegalVerifier')).toBe('Người xác minh pháp lý')
    expect(roleLabel('Other')).toBe('Other')
  })

  it('userStatusInfo_KnownAndUnknown_ReturnsTextAndTone', () => {
    expect(userStatusInfo('Locked')).toEqual({ text: 'Bị khóa', tone: 'warn' })
    expect(userStatusInfo('X')).toEqual({ text: 'X', tone: 'muted' })
  })
})

describe('adminErrorMessage', () => {
  it.each([
    [400, 'Thông tin không hợp lệ. Vui lòng kiểm tra lại.'],
    [403, 'Bạn không có quyền Quản trị hệ thống.'],
    [404, 'Không tìm thấy người dùng. Vui lòng tải lại danh sách.'],
    [409, 'Email này đã được sử dụng.'],
  ])('adminErrorMessage_Status%i_ReturnsVietnameseMessage', (status, expected) => {
    expect(adminErrorMessage({ status })).toBe(expected)
  })

  it('adminErrorMessage_Other_UsesServerMessageOrFallback', () => {
    expect(adminErrorMessage({ status: 500, message: 'Lỗi.' })).toBe('Lỗi.')
    expect(adminErrorMessage({})).toBe('Đã có lỗi xảy ra, vui lòng thử lại.')
  })
})
