import { describeNotification, formatUnreadCount } from './notifications'

const notice = (overrides) => ({ notificationId: 1, type: 'Handover', title: 'Executor accepted handover', message: 'The assigned Executor accepted your handover request.', isRead: false, createdAt: '2026-10-23T01:00:00Z', ...overrides })

describe('describeNotification', () => {
  it('describeNotification_ExecutorAccepted_ReturnsVietnameseTitleAndBody', () => {
    expect(describeNotification(notice())).toMatchObject({
      title: 'Executor đã tiếp nhận hồ sơ bàn giao',
      body: 'Executor được giao đã tiếp nhận hồ sơ bàn giao của bạn.',
      tone: 'ok',
      requestId: null,
    })
  })

  it('describeNotification_ExecutorDeclined_ExtractsRequestIdAndReason', () => {
    expect(describeNotification(notice({ title: 'Executor declined handover', message: 'Handover #12:  Tôi đang bận công tác ' }))).toMatchObject({
      title: 'Executor đã từ chối hồ sơ bàn giao',
      body: 'Hồ sơ #12 bị từ chối. Lý do: Tôi đang bận công tác',
      tone: 'warn',
      requestId: 12,
    })
  })

  it('describeNotification_DeclinedWithoutReasonText_StillExplains', () => {
    expect(describeNotification(notice({ title: 'Executor declined handover', message: 'Handover #12:   ' })).body).toBe('Hồ sơ #12 bị từ chối.')
  })

  it('describeNotification_UnknownTitle_KeepsServerTextAndLinksHandoverNumber', () => {
    expect(describeNotification(notice({ title: 'Something new', message: 'Handover #7 changed' }))).toMatchObject({
      title: 'Something new',
      body: 'Handover #7 changed',
      tone: 'info',
      requestId: 7,
    })
  })

  it('describeNotification_AssignmentRevoked_ReturnsVietnamese', () => {
    expect(describeNotification(notice({ type: 'Assignment', title: 'Vault assignment revoked', message: 'The Owner revoked your vault assignment.' })).title).toBe('Phân công Executor đã bị thu hồi')
  })

  it('describeNotification_MissingFields_DoesNotThrow', () => {
    expect(describeNotification({ notificationId: 2 })).toMatchObject({ title: 'Thông báo', body: '', requestId: null })
  })
})

describe('formatUnreadCount', () => {
  it.each([
    [0, ''],
    [3, '3'],
    [99, '99'],
    [100, '99+'],
    [250, '99+'],
  ])('formatUnreadCount_%i_Returns%s', (count, expected) => {
    expect(formatUnreadCount(count)).toBe(expected)
  })
})
