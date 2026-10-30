import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getHandoverOverview } from '../../callapi/adminApi'
import AdminHandoversPage from './AdminHandoversPage'

vi.mock('../../callapi/adminApi', () => ({ getHandoverOverview: vi.fn() }))

const item = (requestId, extra = {}) => ({
  requestId,
  vaultId: 15,
  vaultName: 'Kho gia đình',
  owner: { userId: 5, fullName: 'Phạm Nhật Tiến' },
  executorId: 26,
  executorName: 'Người thi hành',
  status: 'Pending_Legal',
  initiatedAt: '2026-10-23T14:00:00',
  completedAt: null,
  ...extra,
})

describe('AdminHandoversPage', () => {
  beforeEach(() => vi.resetAllMocks())

  it('list_Loaded_ShowsEverySystemHandoverWithOwnerExecutorAndStatus', async () => {
    getHandoverOverview.mockResolvedValue({ page: 1, pageSize: 20, items: [item(4), item(7, { status: 'Completed', completedAt: '2026-10-24T02:58:00' })] })
    render(<AdminHandoversPage />)
    expect(await screen.findByText('HS-2026-0004')).toBeInTheDocument()
    expect(screen.getByText('HS-2026-0007')).toBeInTheDocument()
    expect(screen.getAllByText('Phạm Nhật Tiến')).toHaveLength(2)
    const table = within(screen.getByRole('table'))
    expect(table.getByText('Chờ thẩm định pháp lý')).toBeInTheDocument()
    // "Hoàn tất" xuất hiện ở tiêu đề cột và ở nhãn trạng thái của hồ sơ #7
    expect(table.getAllByText('Hoàn tất')).toHaveLength(2)
    expect(getHandoverOverview).toHaveBeenCalledWith({ page: 1, pageSize: 20, status: '', ownerId: '' })
  })

  it('filter_StatusAndOwner_SendsThemAndResetsToFirstPage', async () => {
    getHandoverOverview.mockResolvedValue({ page: 1, pageSize: 20, items: [item(4)] })
    render(<AdminHandoversPage />)
    await screen.findByText('HS-2026-0004')
    fireEvent.change(screen.getByLabelText('Lọc theo trạng thái'), { target: { value: 'Completed' } })
    fireEvent.change(screen.getByLabelText('Lọc theo ID chủ kho'), { target: { value: '5' } })
    await waitFor(() => expect(getHandoverOverview).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, status: 'Completed', ownerId: '5' }))
  })

  it('filter_OwnerIdNotNumber_IsNotSent', async () => {
    getHandoverOverview.mockResolvedValue({ page: 1, pageSize: 20, items: [item(4)] })
    render(<AdminHandoversPage />)
    await screen.findByText('HS-2026-0004')
    fireEvent.change(screen.getByLabelText('Lọc theo ID chủ kho'), { target: { value: 'abc' } })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(getHandoverOverview).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, status: '', ownerId: '' })
  })

  it('list_Empty_ShowsEmptyMessage', async () => {
    getHandoverOverview.mockResolvedValue({ page: 1, pageSize: 20, items: [] })
    render(<AdminHandoversPage />)
    expect(await screen.findByText('Không có hồ sơ bàn giao phù hợp.')).toBeInTheDocument()
  })

  it('list_EndpointMissing404_ExplainsServerHasNoAdminApiYet', async () => {
    getHandoverOverview.mockRejectedValue({ status: 404, message: 'Not Found' })
    render(<AdminHandoversPage />)
    expect(await screen.findByText(/chưa có API danh sách hồ sơ bàn giao dành cho Admin/)).toBeInTheDocument()
    expect(screen.getByText(/GET \/api\/admin\/handovers/)).toBeInTheDocument()
  })

  it('list_Forbidden403_ExplainsAdminIsNotAllowed', async () => {
    getHandoverOverview.mockRejectedValue({ status: 403, message: 'Forbidden' })
    render(<AdminHandoversPage />)
    expect(await screen.findByText(/chưa được phép xem danh sách hồ sơ bàn giao toàn hệ thống/)).toBeInTheDocument()
  })

  it('list_ServerError_ShowsMessageAndRetryReloads', async () => {
    getHandoverOverview.mockRejectedValueOnce(new Error('Máy chủ lỗi')).mockResolvedValue({ page: 1, pageSize: 20, items: [item(4)] })
    render(<AdminHandoversPage />)
    expect(await screen.findByText('Máy chủ lỗi')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('HS-2026-0004')).toBeInTheDocument()
  })
})
