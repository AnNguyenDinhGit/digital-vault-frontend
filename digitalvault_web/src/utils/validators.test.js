import { isValidEmail, validateLogin, validateRegister } from './validators'

describe('validators', () => {
  it('isValidEmail_ValidAddress_ReturnsTrue', () => {
    expect(isValidEmail('an.nguyen@aeternavault.io')).toBe(true)
  })

  it('isValidEmail_MissingDomain_ReturnsFalse', () => {
    expect(isValidEmail('an.nguyen@')).toBe(false)
  })

  it('validateLogin_EmptyFields_ReturnsBothErrors', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Vui lòng nhập email.',
      password: 'Vui lòng nhập mật khẩu.',
    })
  })

  it('validateLogin_InvalidEmail_ReturnsEmailError', () => {
    expect(validateLogin({ email: 'abc', password: 'x' })).toEqual({ email: 'Email không hợp lệ.' })
  })

  it('validateLogin_PasswordTooLong_ReturnsPasswordError', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'x'.repeat(1025) })).toEqual({
      password: 'Mật khẩu tối đa 1024 ký tự.',
    })
  })

  it('validateLogin_ValidInput_ReturnsEmptyObject', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'secret' })).toEqual({})
  })
})

describe('validateRegister', () => {
  const valid = {
    fullName: 'Nguyễn Văn An',
    email: 'an.nguyen@example.com',
    phone: '0901 234 567',
    password: 'Secure#Pass2026',
    confirmPassword: 'Secure#Pass2026',
    acceptTerms: true,
  }

  it('validateRegister_ValidInput_ReturnsEmptyObject', () => {
    expect(validateRegister(valid)).toEqual({})
  })

  it('validateRegister_EmptyForm_ReturnsAllRequiredErrors', () => {
    const errors = validateRegister({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', acceptTerms: false })
    expect(Object.keys(errors).sort()).toEqual(['acceptTerms', 'confirmPassword', 'email', 'fullName', 'password', 'phone'])
  })

  it('validateRegister_FullNameTooLong_ReturnsFullNameError', () => {
    expect(validateRegister({ ...valid, fullName: 'a'.repeat(101) })).toEqual({ fullName: 'Họ tên tối đa 100 ký tự.' })
  })

  it('validateRegister_EmailTooLong_ReturnsEmailError', () => {
    expect(validateRegister({ ...valid, email: `${'a'.repeat(140)}@example.com` })).toEqual({ email: 'Email tối đa 150 ký tự.' })
  })

  it('validateRegister_InvalidPhone_ReturnsPhoneError', () => {
    expect(validateRegister({ ...valid, phone: '09ab' })).toEqual({ phone: 'Số điện thoại không hợp lệ.' })
  })

  it('validateRegister_PasswordShorterThan12_ReturnsPasswordError', () => {
    expect(validateRegister({ ...valid, password: 'Abc#1234567', confirmPassword: 'Abc#1234567' })).toEqual({
      password: 'Mật khẩu tối thiểu 12 ký tự, có số và ký tự đặc biệt.',
    })
  })

  it('validateRegister_PasswordWithoutSpecialChar_ReturnsPasswordError', () => {
    expect(validateRegister({ ...valid, password: 'SecurePass2026', confirmPassword: 'SecurePass2026' })).toEqual({
      password: 'Mật khẩu tối thiểu 12 ký tự, có số và ký tự đặc biệt.',
    })
  })

  it('validateRegister_ConfirmMismatch_ReturnsConfirmError', () => {
    expect(validateRegister({ ...valid, confirmPassword: 'Other#Pass2026' })).toEqual({
      confirmPassword: 'Mật khẩu xác nhận không khớp.',
    })
  })

  it('validateRegister_TermsNotAccepted_ReturnsTermsError', () => {
    expect(validateRegister({ ...valid, acceptTerms: false })).toEqual({
      acceptTerms: 'Bạn cần đồng ý với Điều khoản dịch vụ.',
    })
  })
})
