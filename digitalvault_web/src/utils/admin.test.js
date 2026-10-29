import { adminErrorMessage, formatBytes, integrationStatusInfo, permissionLabel, roleLabel, severityInfo, userStatusInfo, validateAdminProfile, validateAdminUser, validateNewPassword, validateSystemConfig } from './admin'

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

describe('validateAdminProfile', () => {
  it('validateAdminProfile_ValidInput_ReturnsNoErrors', () => {
    expect(validateAdminProfile({ fullName: 'Phạm Thu Hà', phone: '0912345678', identityNumber: '001200001234' })).toEqual({})
  })

  it('validateAdminProfile_BlankName_RequiresName', () => {
    expect(validateAdminProfile({ fullName: '  ', phone: '', identityNumber: '' }).fullName).toBe('Vui lòng nhập họ tên.')
  })

  it('validateAdminProfile_TooLongFields_ReturnsLengthErrors', () => {
    const errors = validateAdminProfile({ fullName: 'a'.repeat(101), phone: '1'.repeat(21), identityNumber: '2'.repeat(21) })
    expect(errors.fullName).toContain('100')
    expect(errors.phone).toContain('20')
    expect(errors.identityNumber).toContain('20')
  })
})

describe('validateNewPassword', () => {
  it('validateNewPassword_Empty_RequiresPassword', () => {
    expect(validateNewPassword('')).toBe('Vui lòng nhập mật khẩu mới.')
  })

  it('validateNewPassword_TooShort_ReturnsMinLengthMessage', () => {
    expect(validateNewPassword('ngan')).toContain('12')
  })

  it('validateNewPassword_TwelveChars_IsValid', () => {
    expect(validateNewPassword('a'.repeat(12))).toBe('')
  })
})

describe('validateSystemConfig', () => {
  const valid = {
    encryptionPolicy: { defaultAlgorithm: 'AES-256-GCM', keyRotationIntervalDays: 90, minPasswordLength: 12, require2FAForAdmin: true },
    proofOfLifePolicy: { defaultPingIntervalDays: 30, gracePeriodDays: 7, warningDaysBeforeGrace: 3 },
    storagePolicy: { maxUploadSizeBytes: 10485760, allowedExtensions: ['.pdf', '.png'] },
    backupPolicy: { autoBackupEnabled: true, cronSchedule: '0 0 * * *', retentionDays: 30 },
  }

  it('validateSystemConfig_DefaultConfig_ReturnsNoErrors', () => {
    expect(validateSystemConfig(valid)).toEqual({})
  })

  it('validateSystemConfig_NonPositiveOrFractionalNumbers_ReturnErrors', () => {
    const errors = validateSystemConfig({
      ...valid,
      encryptionPolicy: { ...valid.encryptionPolicy, keyRotationIntervalDays: 0, minPasswordLength: 5 },
      proofOfLifePolicy: { defaultPingIntervalDays: 1.5, gracePeriodDays: -1, warningDaysBeforeGrace: -2 },
      storagePolicy: { ...valid.storagePolicy, maxUploadSizeBytes: 0 },
      backupPolicy: { ...valid.backupPolicy, retentionDays: 0 },
    })
    expect(Object.keys(errors).sort()).toEqual(
      ['defaultPingIntervalDays', 'gracePeriodDays', 'keyRotationIntervalDays', 'maxUploadSizeBytes', 'minPasswordLength', 'retentionDays', 'warningDaysBeforeGrace'].sort(),
    )
  })

  it('validateSystemConfig_WarningNotBeforeGrace_ReturnsError', () => {
    const errors = validateSystemConfig({ ...valid, proofOfLifePolicy: { defaultPingIntervalDays: 30, gracePeriodDays: 3, warningDaysBeforeGrace: 5 } })
    expect(errors.warningDaysBeforeGrace).toContain('thời gian ân hạn')
  })

  it('validateSystemConfig_BadExtensions_ReturnsError', () => {
    expect(validateSystemConfig({ ...valid, storagePolicy: { ...valid.storagePolicy, allowedExtensions: [] } }).allowedExtensions).toBeDefined()
    expect(validateSystemConfig({ ...valid, storagePolicy: { ...valid.storagePolicy, allowedExtensions: ['pdf'] } }).allowedExtensions).toBeDefined()
  })

  it('validateSystemConfig_BadCron_ReturnsError', () => {
    expect(validateSystemConfig({ ...valid, backupPolicy: { ...valid.backupPolicy, cronSchedule: 'moi ngay' } }).cronSchedule).toBeDefined()
    expect(validateSystemConfig({ ...valid, backupPolicy: { ...valid.backupPolicy, cronSchedule: '' } }).cronSchedule).toBeDefined()
  })
})

describe('admin display helpers', () => {
  it('severityInfo_KnownAndUnknown_ReturnsVietnameseLabelAndTone', () => {
    expect(severityInfo('Critical')).toEqual({ text: 'Nghiêm trọng', tone: 'warn' })
    expect(severityInfo('Warning')).toEqual({ text: 'Cảnh báo', tone: 'caution' })
    expect(severityInfo('Info')).toEqual({ text: 'Thông tin', tone: 'info' })
    expect(severityInfo('Lạ')).toEqual({ text: 'Lạ', tone: 'muted' })
  })

  it('integrationStatusInfo_Statuses_ReturnsLabelAndTone', () => {
    expect(integrationStatusInfo('Connected')).toEqual({ text: 'Đã kết nối', tone: 'ok' })
    expect(integrationStatusInfo('Disconnected').tone).toBe('warn')
    expect(integrationStatusInfo('Xyz')).toEqual({ text: 'Xyz', tone: 'muted' })
  })

  it('permissionLabel_KnownAndUnknown_ReturnsVietnameseOrCode', () => {
    expect(permissionLabel('vault:create')).toBe('Tạo kho')
    expect(permissionLabel('abc:xyz')).toBe('abc:xyz')
  })

  it('formatBytes_Sizes_ReturnsHumanReadable', () => {
    expect(formatBytes(10485760)).toBe('10 MB')
    expect(formatBytes(1536)).toBe('1,5 KB')
    expect(formatBytes(500)).toBe('500 B')
  })
})
