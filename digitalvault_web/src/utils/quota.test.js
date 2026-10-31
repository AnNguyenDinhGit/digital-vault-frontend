import { parseQuotaError, quotaMessage } from './quota'

const STORAGE = 'Storage limit exceeded. Used 1048576000 bytes; limit is 1073741824 bytes.'

describe('parseQuotaError', () => {
  it('parseQuotaError_VaultLimit_ReturnsMaxVaults', () => {
    expect(parseQuotaError('Vault limit reached (3). Upgrade your plan or close an active vault.')).toEqual({ type: 'vault', maxVaults: 3 })
  })

  it('parseQuotaError_StorageLimit_ReturnsUsedAndLimitBytes', () => {
    expect(parseQuotaError(STORAGE)).toEqual({ type: 'storage', usedBytes: 1048576000, limitBytes: 1073741824 })
  })

  it('parseQuotaError_StorageLimitWithoutNumbers_StillDetected', () => {
    expect(parseQuotaError('Storage limit exceeded.')).toEqual({ type: 'storage', usedBytes: null, limitBytes: null })
  })

  it('parseQuotaError_QuotaRange_ReturnsRangeType', () => {
    expect(parseQuotaError('Stored data size exceeds the supported quota range.')).toEqual({ type: 'range' })
  })

  it('parseQuotaError_OtherConflicts_ReturnsNull', () => {
    expect(parseQuotaError('Handover records protect this vault from mutation.')).toBeNull()
    expect(parseQuotaError('Allocation exceeds 100%.')).toBeNull()
    expect(parseQuotaError(undefined)).toBeNull()
    expect(parseQuotaError('')).toBeNull()
  })
})

describe('quotaMessage', () => {
  it('quotaMessage_VaultLimit_ExplainsPlanAndWhereToUpgrade', () => {
    const message = quotaMessage({ type: 'vault', maxVaults: 1 })
    expect(message).toContain('hết số kho của gói hiện tại')
    expect(message).toContain('tối đa 1 kho')
    expect(message).toContain('Gói dịch vụ')
  })

  it('quotaMessage_StorageForOwner_ShowsUsedAndLimitInReadableUnits', () => {
    const message = quotaMessage(parseQuotaError(STORAGE))
    expect(message).toContain('đã dùng 1000 MB trên 1 GB')
    expect(message).toContain('Gói dịch vụ')
  })

  it('quotaMessage_StorageWithoutNumbers_OmitsTheUsageSentence', () => {
    expect(quotaMessage({ type: 'storage', usedBytes: null, limitBytes: null })).not.toContain('đã dùng')
  })

  it('quotaMessage_StorageForExecutor_AsksOwnerToUpgrade', () => {
    const message = quotaMessage(parseQuotaError(STORAGE), { forOwner: false })
    expect(message).toContain('chủ kho')
    expect(message).not.toContain('đã dùng')
  })

  it('quotaMessage_Range_AsksToContactAdmin', () => {
    expect(quotaMessage({ type: 'range' })).toContain('quản trị viên')
  })
})
