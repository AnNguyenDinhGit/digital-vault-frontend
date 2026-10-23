import { executorBadgeClass, executorErrorMessage, executorStatusLabel, revokeExecutorErrorMessage } from './executor'

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
