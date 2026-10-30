import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ReviewHistory from './ReviewHistory'

const at = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi).toISOString()
const entries = [
  { verificationId: 2, verifierId: 28, verifierName: 'Nguyễn Văn Cường', status: 'Pending', submittedAt: at(2026, 10, 24, 9, 0), reviewedAt: null, comment: null },
  { verificationId: 1, verifierId: 28, verifierName: 'Nguyễn Văn Cường', status: 'Additional_Info', submittedAt: at(2026, 10, 23, 14, 0), reviewedAt: at(2026, 10, 23, 15, 30), comment: 'Thiếu giấy chứng tử bản gốc' },
]

describe('ReviewHistory', () => {
  it('entries_Listed_ShowStatusVerifierCommentAndTimes', () => {
    render(<ReviewHistory entries={entries} />)
    expect(screen.getByRole('heading', { name: 'Lịch sử thẩm định (2)' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('Đang chờ thẩm định')).toBeInTheDocument()
    expect(within(items[0]).getByText(/Chưa có kết quả/)).toBeInTheDocument()
    expect(within(items[1]).getByText('Cần bổ sung hồ sơ')).toBeInTheDocument()
    expect(within(items[1]).getByText('Thiếu giấy chứng tử bản gốc')).toBeInTheDocument()
    expect(within(items[1]).getByText(/Thẩm định lúc 23\/10\/2026 15:30/)).toBeInTheDocument()
    expect(within(items[1]).getByText('Nguyễn Văn Cường')).toBeInTheDocument()
  })

  it('entries_VerifierNameMissing_FallsBackToVerifierId', () => {
    render(<ReviewHistory entries={[{ ...entries[0], verifierName: null }]} />)
    expect(screen.getByText('Người xác minh #28')).toBeInTheDocument()
  })

  it('entries_Empty_ShowsEmptyMessage', () => {
    render(<ReviewHistory entries={[]} />)
    expect(screen.getByText('Hồ sơ này chưa có lần thẩm định nào.')).toBeInTheDocument()
  })
})
