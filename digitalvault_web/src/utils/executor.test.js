import {
  assetNamesOf,
  executorBadgeClass,
  executorErrorMessage,
  executorStatusLabel,
  handoverOwnerName,
  revokeExecutorErrorMessage,
  vaultLabel,
  vaultNamesOf,
} from './executor'

describe('executorStatusLabel', () => {
  it.each([
    ['Active', 'Đang hiệu lực'],
    ['AutoAssigned', 'Hệ thống tự chọn'],
    ['Revoked', 'Đã thu hồi'],
    ['Khác', 'Khác'],
  ])('executorStatusLabel_%s_Returns%s', (status, expected) => {
    expect(executorStatusLabel(status)).toBe(expected)
  })
})

describe('executorBadgeClass', () => {
  it('executorBadgeClass_ActiveAndAutoAssigned_AreGreen', () => {
    expect(executorBadgeClass('Active')).toBe('av-badge-ok')
    expect(executorBadgeClass('AutoAssigned')).toBe('av-badge-ok')
  })

  it('executorBadgeClass_Revoked_IsMuted', () => {
    expect(executorBadgeClass('Revoked')).toBe('av-badge-muted')
  })
})

describe('revokeExecutorErrorMessage', () => {
  it('revokeExecutorErrorMessage_Conflict409_ExplainsExecutorAlreadyAcceptedOrProcessing', () => {
    expect(revokeExecutorErrorMessage({ status: 409 })).toBe(
      'Không thu hồi được: Executor đã tiếp nhận hoặc đang xử lý hồ sơ bàn giao của kho này (hoặc kho đã đóng).',
    )
  })

  it('revokeExecutorErrorMessage_NotFound404_SaysNoActiveAssignment', () => {
    expect(revokeExecutorErrorMessage({ status: 404 })).toBe('Kho này không còn người thi hành đang hiệu lực. Vui lòng tải lại trang.')
  })

  it('revokeExecutorErrorMessage_Other_FallsBackToGenericExecutorMessage', () => {
    expect(revokeExecutorErrorMessage({ status: 403 })).toBe(executorErrorMessage({ status: 403 }))
  })
})

describe('tên hiển thị của hồ sơ (kho, chủ kho, tài sản)', () => {
  it('handoverOwnerName_PrefersOwnerNameThenOwnerFullName', () => {
    expect(handoverOwnerName({ ownerName: 'A', owner: { fullName: 'B' } })).toBe('A')
    expect(handoverOwnerName({ owner: { fullName: 'B' } })).toBe('B')
    expect(handoverOwnerName({})).toBeNull()
    expect(handoverOwnerName(null)).toBeNull()
  })

  it('vaultLabel_WithAndWithoutName', () => {
    expect(vaultLabel(17, 'Kho gia đình')).toBe('Kho gia đình')
    expect(vaultLabel(17, null)).toBe('Kho #17')
  })

  it('vaultNamesOf_MapsOnlyAssignmentsThatHaveAName', () => {
    const names = vaultNamesOf([{ vaultId: 1, vaultName: 'A' }, { vaultId: 2, vaultName: null }, { vaultId: 3 }])
    expect([...names.entries()]).toEqual([[1, 'A']])
    expect(vaultNamesOf(undefined).size).toBe(0)
  })

  it('assetNamesOf_DedupesAndSkipsEmpty', () => {
    expect(assetNamesOf([{ assetName: 'Ví' }, { assetName: 'Ví' }, { assetName: null }, { assetName: 'Sổ' }])).toEqual(['Ví', 'Sổ'])
    expect(assetNamesOf(undefined)).toEqual([])
  })
})
