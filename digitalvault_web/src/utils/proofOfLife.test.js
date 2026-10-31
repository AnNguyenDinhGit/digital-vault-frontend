import {
  PROOF_OF_LIFE_DEFAULTS,
  computeProofOfLife,
  daysFromNow,
  describeCycle,
  formatDate,
  formatDateTime,
  proofOfLifeStatusLabel,
  validateProofOfLife,
} from './proofOfLife'

const DAY = 24 * 60 * 60 * 1000
const at = (year, month, day, hour = 9, minute = 0) => new Date(year, month - 1, day, hour, minute)
const config = { frequencyDays: 30, gracePeriodDays: 7, lastPingAt: at(2026, 10, 1).toISOString() }

describe('computeProofOfLife', () => {
  it('computeProofOfLife_BeforeDueDate_IsActiveWithRemainingDays', () => {
    const result = computeProofOfLife(config, at(2026, 10, 11))
    expect(result.status).toBe('Active')
    expect(result.daysUntilDue).toBe(20)
  })

  it('computeProofOfLife_Always_ReturnsDueAndGraceEndDates', () => {
    const result = computeProofOfLife(config, at(2026, 10, 11))
    expect(new Date(result.nextPingDue).getTime()).toBe(at(2026, 10, 1).getTime() + 30 * DAY)
    expect(new Date(result.graceEndsAt).getTime()).toBe(at(2026, 10, 1).getTime() + 37 * DAY)
  })

  it('computeProofOfLife_ExactlyAtDueMoment_IsStillActive', () => {
    const due = new Date(at(2026, 10, 1).getTime() + 30 * DAY)
    expect(computeProofOfLife(config, due).status).toBe('Active')
  })

  it('computeProofOfLife_PastDueWithinGrace_IsWarning', () => {
    const result = computeProofOfLife(config, new Date(at(2026, 10, 1).getTime() + 33 * DAY))
    expect(result.status).toBe('Warning')
    expect(result.daysUntilDue).toBeLessThan(0)
    expect(result.daysUntilTrigger).toBe(4)
  })

  it('computeProofOfLife_PastGraceEnd_IsTriggered', () => {
    const result = computeProofOfLife(config, new Date(at(2026, 10, 1).getTime() + 38 * DAY))
    expect(result.status).toBe('Triggered')
  })
})

describe('proofOfLifeStatusLabel', () => {
  it('proofOfLifeStatusLabel_KnownStatuses_ReturnVietnamese', () => {
    expect(proofOfLifeStatusLabel('Active')).toBe('Đang hoạt động')
    expect(proofOfLifeStatusLabel('Warning')).toBe('Cảnh báo')
    expect(proofOfLifeStatusLabel('Triggered')).toBe('Đã kích hoạt')
  })

  it('proofOfLifeStatusLabel_Unknown_ReturnsRawValue', () => {
    expect(proofOfLifeStatusLabel('Khac')).toBe('Khac')
  })
})

describe('validateProofOfLife', () => {
  const message = 'Chu kỳ hoặc thời gian ân hạn phải là số nguyên dương từ 1 ngày trở lên.'

  it('validateProofOfLife_ValidValues_ReturnsEmptyObject', () => {
    expect(validateProofOfLife({ frequencyDays: '30', gracePeriodDays: '7' })).toEqual({})
  })

  it('validateProofOfLife_NegativeFrequency_ReturnsMessage', () => {
    expect(validateProofOfLife({ frequencyDays: '-5', gracePeriodDays: '7' })).toEqual({ frequencyDays: message })
  })

  it('validateProofOfLife_ZeroOrEmptyGrace_ReturnsMessage', () => {
    expect(validateProofOfLife({ frequencyDays: '30', gracePeriodDays: '0' })).toEqual({ gracePeriodDays: message })
    expect(validateProofOfLife({ frequencyDays: '30', gracePeriodDays: '' })).toEqual({ gracePeriodDays: message })
  })

  it('validateProofOfLife_DecimalOrText_ReturnsMessage', () => {
    expect(validateProofOfLife({ frequencyDays: '7.5', gracePeriodDays: 'abc' })).toEqual({
      frequencyDays: message,
      gracePeriodDays: message,
    })
  })

  it('validateProofOfLife_TooLarge_ReturnsLimitMessages', () => {
    expect(validateProofOfLife({ frequencyDays: '366', gracePeriodDays: '91' })).toEqual({
      frequencyDays: 'Chu kỳ tối đa 365 ngày.',
      gracePeriodDays: 'Thời gian ân hạn tối đa 90 ngày.',
    })
  })
})

describe('describeCycle', () => {
  it('describeCycle_Values_ExplainsTotalDays', () => {
    expect(describeCycle(30, 7)).toBe(
      'Nếu bạn không điểm danh trong 30 ngày, hệ thống gửi email cảnh báo. Sau thêm 7 ngày ân hạn (tổng 37 ngày), quy trình bàn giao sẽ được kích hoạt.',
    )
  })
})

describe('date formatting', () => {
  it('formatDateTime_Date_ReturnsDayMonthYearAndTime', () => {
    expect(formatDateTime(at(2026, 10, 13, 9, 5).toISOString())).toBe('13/10/2026 09:05')
  })

  it('formatDate_Date_ReturnsDayMonthYear', () => {
    expect(formatDate(at(2026, 1, 2).toISOString())).toBe('02/01/2026')
  })
})

describe('PROOF_OF_LIFE_DEFAULTS', () => {
  it('defaults_Constants_Are30And7', () => {
    expect(PROOF_OF_LIFE_DEFAULTS).toEqual({ frequencyDays: 30, gracePeriodDays: 7 })
  })
})

describe('thời gian của BE không kèm múi giờ', () => {
  // BE trả giờ UTC dạng 2026-10-23T14:26:00 (không có Z): phải hiểu là UTC rồi đổi sang giờ địa phương
  const utc = '2026-10-23T14:26:00'
  const local = new Date(Date.UTC(2026, 9, 23, 14, 26, 0))
  const pad = (n) => String(n).padStart(2, '0')

  it('formatDateTime_NoTimezoneString_IsReadAsUtcAndShownInLocalTime', () => {
    const expected = `${pad(local.getDate())}/${pad(local.getMonth() + 1)}/${local.getFullYear()} ${pad(local.getHours())}:${pad(local.getMinutes())}`
    expect(formatDateTime(utc)).toBe(expected)
  })

  it('formatDateTime_NoTimezoneAndZStringsOfSameInstant_ShowTheSameTime', () => {
    expect(formatDateTime('2026-10-23T14:26:00')).toBe(formatDateTime('2026-10-23T14:26:00Z'))
    expect(formatDateTime('2026-10-23T14:26:00.1234567')).toBe(formatDateTime('2026-10-23T21:26:00.1234567+07:00'))
  })

  it('formatDate_NoTimezoneString_FollowsTheUtcInstant', () => {
    expect(formatDate('2026-10-23T23:30:00')).toBe(formatDate('2026-10-23T23:30:00Z'))
  })

  it('daysFromNow_NoTimezoneString_UsesUtcInstant', () => {
    expect(daysFromNow('2026-10-23T14:00:00', new Date('2026-10-22T14:00:00Z'))).toBe(1)
  })
})
