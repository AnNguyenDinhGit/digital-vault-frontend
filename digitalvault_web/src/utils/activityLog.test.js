import {
  actionLabel,
  buildCsv,
  entityLabel,
  filterLogs,
  getActionOptions,
  resultInfo,
} from './activityLog'

const at = (year, month, day, hour = 9, minute = 0) => new Date(year, month - 1, day, hour, minute).toISOString()

const logs = [
  { logId: 3, action: 'CreateAsset', entityType: 'DigitalAsset', entityId: 7, timestamp: at(2026, 10, 12, 8), ipAddress: '14.161.42.90', result: 'Success' },
  { logId: 2, action: 'Login', entityType: 'User', entityId: 1, timestamp: at(2026, 10, 11, 23, 30), ipAddress: '113.190.234.12', result: 'Failed' },
  { logId: 1, action: 'UploadAssetDocument', entityType: 'DigitalAsset', entityId: 7, timestamp: at(2026, 10, 10, 15), ipAddress: '14.161.42.90', result: 'Pending_Legal' },
]

describe('labels', () => {
  it('actionLabel_KnownAction_ReturnsVietnamese', () => {
    expect(actionLabel('Login')).toBe('Đăng nhập')
    expect(actionLabel('AssignBeneficiary')).toBe('Chỉ định người thụ hưởng')
    expect(actionLabel('PingProofOfLife')).toBe('Điểm danh sự sống')
  })

  it('actionLabel_UnknownAction_ReturnsRawCode', () => {
    expect(actionLabel('SomethingNew')).toBe('SomethingNew')
  })

  it('entityLabel_KnownTypes_ReturnsVietnameseWithId', () => {
    expect(entityLabel('DigitalVault', 4)).toBe('Kho #4')
    expect(entityLabel('DigitalAsset', 7)).toBe('Tài sản #7')
    expect(entityLabel('HandoverRequest', 2)).toBe('Đơn bàn giao #2')
  })

  it('entityLabel_NoEntity_ReturnsDash', () => {
    expect(entityLabel(null, null)).toBe('—')
  })

  it('resultInfo_KnownResults_ReturnTextAndTone', () => {
    expect(resultInfo('Success')).toEqual({ text: 'Thành công', tone: 'ok' })
    expect(resultInfo('Failed')).toEqual({ text: 'Thất bại', tone: 'warn' })
    expect(resultInfo('Alive_Signed')).toEqual({ text: 'Đã ký số', tone: 'ok' })
    expect(resultInfo('Pending_Legal')).toEqual({ text: 'Chờ pháp lý', tone: 'info' })
  })

  it('resultInfo_Unknown_ReturnsRawWithMutedTone', () => {
    expect(resultInfo('Lạ')).toEqual({ text: 'Lạ', tone: 'muted' })
  })
})

describe('getActionOptions', () => {
  it('getActionOptions_Logs_ReturnsUniqueActionsWithLabelsSortedByLabel', () => {
    const options = getActionOptions([...logs, { ...logs[0], logId: 9 }])
    expect(options.map((o) => o.value).sort()).toEqual(['CreateAsset', 'Login', 'UploadAssetDocument'])
    expect(options.find((o) => o.value === 'Login').label).toBe('Đăng nhập')
    const labels = options.map((o) => o.label)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'vi')))
  })
})

describe('filterLogs', () => {
  const none = { query: '', action: 'all', result: 'all', from: '', to: '' }

  it('filterLogs_NoFilter_ReturnsAll', () => {
    expect(filterLogs(logs, none)).toHaveLength(3)
  })

  it('filterLogs_ByAction_ReturnsOnlyThatAction', () => {
    expect(filterLogs(logs, { ...none, action: 'Login' }).map((l) => l.logId)).toEqual([2])
  })

  it('filterLogs_ByResultFailed_ReturnsFailedOnly', () => {
    expect(filterLogs(logs, { ...none, result: 'Failed' }).map((l) => l.logId)).toEqual([2])
  })

  it('filterLogs_ByResultSuccessGroup_IncludesSignedAndPending', () => {
    expect(filterLogs(logs, { ...none, result: 'Success' }).map((l) => l.logId)).toEqual([3, 1])
  })

  it('filterLogs_QueryIgnoringDiacritics_MatchesActionLabel', () => {
    expect(filterLogs(logs, { ...none, query: 'dang nhap' }).map((l) => l.logId)).toEqual([2])
  })

  it('filterLogs_QueryByIp_MatchesIpAddress', () => {
    expect(filterLogs(logs, { ...none, query: '113.190' }).map((l) => l.logId)).toEqual([2])
  })

  it('filterLogs_QueryByEntity_MatchesEntityLabel', () => {
    expect(filterLogs(logs, { ...none, query: 'tai san #7' }).map((l) => l.logId)).toEqual([3, 1])
  })

  it('filterLogs_FromDate_IsInclusiveFromStartOfDay', () => {
    expect(filterLogs(logs, { ...none, from: '2026-10-11' }).map((l) => l.logId)).toEqual([3, 2])
  })

  it('filterLogs_ToDate_IsInclusiveUntilEndOfDay', () => {
    expect(filterLogs(logs, { ...none, to: '2026-10-11' }).map((l) => l.logId)).toEqual([2, 1])
  })

  it('filterLogs_DateRange_CombinesFromAndTo', () => {
    expect(filterLogs(logs, { ...none, from: '2026-10-11', to: '2026-10-11' }).map((l) => l.logId)).toEqual([2])
  })

  it('filterLogs_CombinedFilters_MustAllMatch', () => {
    expect(filterLogs(logs, { ...none, action: 'Login', result: 'Success' })).toEqual([])
  })
})

describe('buildCsv', () => {
  it('buildCsv_Logs_StartsWithBomAndHeaderRow', () => {
    const csv = buildCsv(logs)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.split('\r\n')[0]).toBe('﻿"Thời gian","Thao tác","Đối tượng","Địa chỉ IP","Kết quả"')
  })

  it('buildCsv_Logs_OneRowPerLogWithLabels', () => {
    const rows = buildCsv(logs).split('\r\n')
    expect(rows).toHaveLength(4)
    expect(rows[1]).toBe('"12/10/2026 08:00","Tạo tài sản","Tài sản #7","14.161.42.90","Thành công"')
  })

  it('buildCsv_ValueWithQuote_EscapesByDoubling', () => {
    const csv = buildCsv([{ ...logs[0], action: 'He said "hi"' }])
    expect(csv).toContain('"He said ""hi"""')
  })

  it('buildCsv_Empty_ReturnsOnlyHeader', () => {
    expect(buildCsv([]).split('\r\n')).toHaveLength(1)
  })
})
