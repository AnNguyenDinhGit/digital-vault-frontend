import { ownerMutationErrorMessage } from './ownerErrors'
import { uploadErrorMessage } from './uploadErrors'

const HANDOVER_DETAIL = 'Handover records protect this vault from mutation.'

describe('ownerMutationErrorMessage', () => {
  it('ownerMutationErrorMessage_HandoverBlocksVault409_ExplainsAndSuggestsCancelling', () => {
    const message = ownerMutationErrorMessage({ status: 409, message: HANDOVER_DETAIL })
    expect(message).toContain('hồ sơ bàn giao')
    expect(message).toContain('hủy')
  })

  it('ownerMutationErrorMessage_InactiveAsset409_SaysNoLongerActive', () => {
    expect(ownerMutationErrorMessage({ status: 409, message: 'Asset is inactive.' })).toBe('Kho hoặc tài sản không còn hoạt động nên không thể thay đổi.')
  })

  it('ownerMutationErrorMessage_InactiveAssignment409_SaysAllocationNotActive', () => {
    expect(ownerMutationErrorMessage({ status: 409, message: 'Assignment is not active.' })).toBe('Phân bổ này không còn hiệu lực.')
  })

  it('ownerMutationErrorMessage_TotalExceeds409_ExplainsTotalLimit', () => {
    expect(ownerMutationErrorMessage({ status: 409, message: 'Allocation total exceeds 100 percent.' })).toBe('Tổng tỷ lệ phân bổ không được vượt 100%.')
  })

  it('ownerMutationErrorMessage_Other409_KeepsServerDetail', () => {
    expect(ownerMutationErrorMessage({ status: 409, message: 'Something else.' })).toContain('Something else.')
  })

  it('ownerMutationErrorMessage_NotFound_AsksToReload', () => {
    expect(ownerMutationErrorMessage({ status: 404 })).toBe('Không tìm thấy dữ liệu. Vui lòng tải lại trang.')
  })

  it('ownerMutationErrorMessage_Forbidden_SaysNoPermission', () => {
    expect(ownerMutationErrorMessage({ status: 403 })).toBe('Bạn không có quyền thực hiện thao tác này.')
  })

  it('ownerMutationErrorMessage_OtherErrors_UseServerMessageOrGeneric', () => {
    expect(ownerMutationErrorMessage({ status: 500, message: 'Lỗi máy chủ.' })).toBe('Lỗi máy chủ.')
    expect(ownerMutationErrorMessage({})).toBe('Đã có lỗi xảy ra, vui lòng thử lại.')
  })
})

describe('uploadErrorMessage for 409', () => {
  it('uploadErrorMessage_HandoverBlocksVault_ExplainsInsteadOfBlamingBeneficiary', () => {
    const message = uploadErrorMessage({ status: 409, message: HANDOVER_DETAIL })
    expect(message).toContain('hồ sơ bàn giao')
    expect(message).not.toContain('Người thụ hưởng không nằm')
  })

  it('uploadErrorMessage_BeneficiaryNotAllocated_KeepsBeneficiaryHint', () => {
    expect(uploadErrorMessage({ status: 409, message: 'Select an existing active allocation; upload does not create allocations.' })).toContain(
      'phân bổ',
    )
  })

  it('uploadErrorMessage_InactiveVaultOrAsset_SaysNoLongerActive', () => {
    expect(uploadErrorMessage({ status: 409, message: 'Vault or asset is not active.' })).toBe('Kho hoặc tài sản không còn hoạt động nên không thể thay đổi.')
  })
})

describe('plan quota conflicts (409)', () => {
  const VAULT_LIMIT = 'Vault limit reached (1). Upgrade your plan or close an active vault.'
  const STORAGE_LIMIT = 'Storage limit exceeded. Used 1048576000 bytes; limit is 1073741824 bytes.'

  it('ownerMutationErrorMessage_VaultLimit_ExplainsPlanLimit', () => {
    const message = ownerMutationErrorMessage({ status: 409, message: VAULT_LIMIT })
    expect(message).toContain('hết số kho của gói hiện tại')
    expect(message).not.toContain('Chi tiết từ máy chủ')
  })

  it('ownerMutationErrorMessage_StorageLimit_ExplainsFullStorage', () => {
    expect(ownerMutationErrorMessage({ status: 409, message: STORAGE_LIMIT })).toContain('đã dùng 1000 MB trên 1 GB')
  })

  it('ownerMutationErrorMessage_QuotaRange_IsNotMistakenForAllocationOverflow', () => {
    const message = ownerMutationErrorMessage({ status: 409, message: 'Stored data size exceeds the supported quota range.' })
    expect(message).not.toContain('tỷ lệ phân bổ')
    expect(message).toContain('quản trị viên')
  })

  it('uploadErrorMessage_StorageLimit_TellsOwnerToUpgradeOrRevokeDocuments', () => {
    const message = uploadErrorMessage({ status: 409, message: STORAGE_LIMIT })
    expect(message).toContain('Dung lượng lưu trữ của gói đã đầy')
    expect(message).toContain('Gói dịch vụ')
  })

  it('ownerMutationErrorMessage_HandoverConflictStillWinsOverQuotaWording', () => {
    expect(ownerMutationErrorMessage({ status: 409, message: HANDOVER_DETAIL })).toContain('hồ sơ bàn giao')
  })
})
