import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAssignments, getHandover, getHandovers } from '../../callapi/executorApi'
import HandoverTable from '../../components/executor/HandoverTable'
import ExecutorHandoverDetailPage from './ExecutorHandoverDetailPage'
import ExecutorOrdersPage from './ExecutorOrdersPage'

vi.mock('../../callapi/executorApi', () => ({
  getAssignments: vi.fn(),
  getHandovers: vi.fn(),
  getHandover: vi.fn(),
  acceptHandover: vi.fn(),
  declineHandover: vi.fn(),
  completeHandover: vi.fn(),
  createHandover: vi.fn(),
  downloadHandoverDocument: vi.fn(),
  requestLegalVerification: vi.fn(),
  simulateLegalApproval: vi.fn(),
  startHandover: vi.fn(),
  uploadDeathCertificate: vi.fn(),
  uploadEvidence: vi.fn(),
}))

const handover = {
  requestId: 7,
  vaultId: 17,
  status: 'Completed',
  initiatedAt: '2026-10-24T02:50:00Z',
  documents: [],
  ownerName: 'Phạm Nhật Tiến',
  owner: { userId: 5, fullName: 'Phạm Nhật Tiến' },
  cases: [
    { handoverId: 8, assetId: 30, assetName: 'Ví lạnh', beneficiaryId: 27, status: 'Completed' },
    { handoverId: 9, assetId: 31, beneficiaryId: 28, status: 'Completed' },
  ],
}
const assignment = { vaultId: 17, vaultName: 'Kho gia đình', status: 'Active', assignedAt: '2026-10-23T00:00:00Z', owner: { userId: 5, fullName: 'Phạm Nhật Tiến' } }

describe('Executor: hiển thị tên thay cho ID', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getHandover.mockResolvedValue(handover)
    getHandovers.mockResolvedValue([handover])
    getAssignments.mockResolvedValue([assignment])
  })

  it('detail_Loaded_ShowsVaultNameOwnerNameAndAssetName', async () => {
    render(
      <MemoryRouter initialEntries={['/executor/handovers/7']}>
        <Routes>
          <Route path="/executor/handovers/:requestId" element={<ExecutorHandoverDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Kho #17 · Kho gia đình')).toBeInTheDocument()
    expect(screen.getByText('Chủ kho: Phạm Nhật Tiến')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Tài sản và người thụ hưởng' })
    expect(within(table).getByText('Ví lạnh')).toBeInTheDocument()
    // Chưa có tên (BE không trả assetName) thì dùng ID
    expect(within(table).getByText('Tài sản #31')).toBeInTheDocument()
  })

  it('detail_AssignmentsFail_FallsBackToVaultId', async () => {
    getAssignments.mockRejectedValue(new Error('boom'))
    render(
      <MemoryRouter initialEntries={['/executor/handovers/7']}>
        <Routes>
          <Route path="/executor/handovers/:requestId" element={<ExecutorHandoverDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Kho #17')).toBeInTheDocument()
    expect(screen.getByText('Chủ kho: Phạm Nhật Tiến')).toBeInTheDocument()
  })

  it('orders_Loaded_ShowsVaultNameOwnerInAssignmentsAndHandoverTable', async () => {
    render(
      <MemoryRouter>
        <ExecutorOrdersPage />
      </MemoryRouter>,
    )
    const assignments = await screen.findByRole('region', { name: 'Kho được phân công' })
    expect(within(assignments).getByText('Kho #17 · Kho gia đình')).toBeInTheDocument()
    expect(within(assignments).getByText('Chủ kho: Phạm Nhật Tiến')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    expect(within(table).getByText('Kho #17 · Kho gia đình')).toBeInTheDocument()
    expect(within(table).getByText('Chủ kho: Phạm Nhật Tiến')).toBeInTheDocument()
    expect(within(table).getByText('Ví lạnh')).toBeInTheDocument()
  })

  it('table_NoVaultNames_ShowsOnlyVaultId', () => {
    render(
      <MemoryRouter>
        <HandoverTable handovers={[{ ...handover, ownerName: null, owner: null, cases: [{ assetId: 1, status: 'Pending' }] }]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Kho #17')).toBeInTheDocument()
    expect(screen.queryByText(/Chủ kho/)).not.toBeInTheDocument()
  })
})
