import { describe, expect, it } from 'vitest'
import { describeLegalNotification } from './notifications'

const note = (title, message) => ({ notificationId: 1, title, message })

describe('describeLegalNotification', () => {
  it('verificationRequested_TranslatesTitleAndBodyWithRequestId', () => {
    const info = describeLegalNotification(note('Legal verification requested', 'Handover #12 needs your review'))
    expect(info).toMatchObject({ title: 'Có hồ sơ mới cần thẩm định pháp lý', body: 'Hồ sơ #12 đã được gửi đến bạn để thẩm định.', requestId: 12, tone: 'info' })
  })

  it('additionalInfoProvided_TranslatesToResubmitted', () => {
    const info = describeLegalNotification(note('Additional information submitted', 'Handover #7: documents added'))
    expect(info).toMatchObject({ title: 'Người thi hành đã bổ sung hồ sơ', requestId: 7 })
  })

  it('deathCertificate_Translated', () => {
    expect(describeLegalNotification(note('Death certificate uploaded', 'Handover #3')).title).toBe('Giấy chứng tử đã được nộp')
  })

  it('cancelled_TranslatedWithWarnTone', () => {
    expect(describeLegalNotification(note('Handover cancelled', 'Handover #9 was cancelled by the owner'))).toMatchObject({ title: 'Hồ sơ bàn giao đã bị hủy', tone: 'warn', requestId: 9 })
  })

  it('unknownTitle_KeepsTitleButLocalizesHandoverNumberInMessage', () => {
    const info = describeLegalNotification(note('Something else happened', 'See Handover #5 for details'))
    expect(info).toMatchObject({ title: 'Something else happened', body: 'See Hồ sơ #5 for details', requestId: 5 })
  })

  it('noTitleNoMessage_FallsBackToSystemNotification', () => {
    expect(describeLegalNotification({ notificationId: 1 })).toMatchObject({ title: 'Thông báo hệ thống', body: '', requestId: null })
  })
})
