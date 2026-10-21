import { HANDOVER_GROUPS, createHandoverErrorMessage, filterHandovers, handoverStatusInfo, isEditableStatus, ownerCreateHandoverErrorMessage } from './handover'

describe('handoverStatusInfo', () => {
  it.each([
    ['Draft', 'Bản nháp'],
    ['Pending_Legal', 'Chờ thẩm định pháp lý'],
    ['Additional_Info', 'Cần bổ sung hồ sơ'],
    ['Rejected', 'Bị từ chối'],
    ['Approved', 'Đã duyệt pháp lý'],
    ['In_Progress', 'Đang bàn giao'],
    ['Completed', 'Hoàn tất'],
    ['Cancelled', 'Đã hủy'],
  ])('handoverStatusInfo_%s_HasVietnameseLabel', (status, text) => {
    expect(handoverStatusInfo(status).text).toBe(text)
  })

  it('handoverStatusInfo_UnknownStatus_KeepsRawCodeWithMutedTone', () => {
    expect(handoverStatusInfo('Weird')).toEqual({ text: 'Weird', tone: 'muted' })
  })

  it('handoverStatusInfo_Tones_MatchMeaning', () => {
    expect(handoverStatusInfo('Completed').tone).toBe('ok')
    expect(handoverStatusInfo('Rejected').tone).toBe('warn')
    expect(handoverStatusInfo('Pending_Legal').tone).toBe('info')
  })
})

describe('isEditableStatus', () => {
  it.each([['Draft'], ['Rejected'], ['Additional_Info']])('isEditableStatus_%s_ReturnsTrue', (status) => {
    expect(isEditableStatus(status)).toBe(true)
  })

  it.each([['Pending_Legal'], ['Approved'], ['In_Progress'], ['Completed'], ['Cancelled']])('isEditableStatus_%s_ReturnsFalse', (status) => {
    expect(isEditableStatus(status)).toBe(false)
  })
})

describe('filterHandovers', () => {
  const list = [
    { requestId: 1, status: 'Draft' },
    { requestId: 2, status: 'Pending_Legal' },
    { requestId: 3, status: 'Additional_Info' },
    { requestId: 4, status: 'Approved' },
    { requestId: 5, status: 'In_Progress' },
    { requestId: 6, status: 'Completed' },
    { requestId: 7, status: 'Cancelled' },
  ]
  const ids = (statuses) => filterHandovers(list, statuses).map((item) => item.requestId)

  it('filterHandovers_NoStatuses_ReturnsAllNewestFirst', () => {
    expect(ids(undefined)).toEqual([7, 6, 5, 4, 3, 2, 1])
  })

  it('filterHandovers_Groups_PickTheRightStatuses', () => {
    expect(ids(HANDOVER_GROUPS.pending)).toEqual([3, 2])
    expect(ids(HANDOVER_GROUPS.approved)).toEqual([4])
    expect(ids(HANDOVER_GROUPS.inProgress)).toEqual([5])
    expect(ids(HANDOVER_GROUPS.history)).toEqual([7, 6])
  })

  it('filterHandovers_DoesNotMutateInput', () => {
    const input = [{ requestId: 1, status: 'Draft' }, { requestId: 9, status: 'Draft' }]
    filterHandovers(input, undefined)
    expect(input.map((item) => item.requestId)).toEqual([1, 9])
  })
})

describe('createHandoverErrorMessage', () => {
  it('createHandoverErrorMessage_Conflict_ExplainsOpenRequestOrNoAllocation', () => {
    expect(createHandoverErrorMessage({ status: 409 })).toBe('Kho này đã có hồ sơ bàn giao đang xử lý hoặc chưa có tài sản nào được phân bổ.')
  })

  it('createHandoverErrorMessage_Forbidden_SaysNotAssigned', () => {
    expect(createHandoverErrorMessage({ status: 403 })).toBe('Bạn không được phân công kho này.')
  })

  it('createHandoverErrorMessage_Other_UsesServerMessageOrGeneric', () => {
    expect(createHandoverErrorMessage({ status: 503, message: 'Không có Executor phù hợp.' })).toBe('Không có Executor phù hợp.')
    expect(createHandoverErrorMessage({})).toBe('Đã có lỗi xảy ra, vui lòng thử lại.')
  })
})

describe('ownerCreateHandoverErrorMessage', () => {
  it.each([
    ['Every active asset needs documents and exactly 100 percent active allocation.', 'giấy tờ'],
    ['Vault is inactive or has a protected handover record.', 'hồ sơ bàn giao chưa hủy'],
    ['Assigned Executor must be independent of the owner and beneficiaries.', 'độc lập'],
    ['Beneficiary unavailable.', 'không còn hoạt động'],
    ['Multiple active executors require administrative correction.', 'quản trị viên'],
  ])('ownerCreateHandoverErrorMessage_Conflict%#_MentionsReason', (detail, expected) => {
    expect(ownerCreateHandoverErrorMessage({ status: 409, message: detail })).toContain(expected)
  })

  it('ownerCreateHandoverErrorMessage_UnknownConflict_UsesGenericConflictText', () => {
    expect(ownerCreateHandoverErrorMessage({ status: 409, message: 'Lạ.' })).toBe('Chưa thể tạo hồ sơ bàn giao vì trạng thái kho hiện tại.')
  })

  it('ownerCreateHandoverErrorMessage_NoExecutor503_AsksToAssignExecutor', () => {
    expect(ownerCreateHandoverErrorMessage({ status: 503 })).toContain('gán Người thi hành')
  })

  it('ownerCreateHandoverErrorMessage_NotFoundAndForbidden_AreExplained', () => {
    expect(ownerCreateHandoverErrorMessage({ status: 404 })).toContain('Không tìm thấy kho')
    expect(ownerCreateHandoverErrorMessage({ status: 403 })).toContain('không có quyền')
  })

  it('ownerCreateHandoverErrorMessage_Other_UsesServerMessageOrGeneric', () => {
    expect(ownerCreateHandoverErrorMessage({ status: 500, message: 'Lỗi.' })).toBe('Lỗi.')
    expect(ownerCreateHandoverErrorMessage({})).toBe('Đã có lỗi xảy ra, vui lòng thử lại.')
  })
})
