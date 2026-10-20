import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import axiosClient from '../../callapi/axiosClient'
import { login } from '../../callapi/authApi'
import { ROLE_ACCOUNTS, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import AdminAuditLogsPage from './AdminAuditLogsPage'

const server = setupServer(...handlers)
const admin = ROLE_ACCOUNTS.find((account) => account.role === 'Admin')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(admin.email, admin.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<AdminAuditLogsPage mockMode="off" />)
const waitForPage = () => screen.findByRole('table', { name: 'Nhật ký kiểm toán' })
const dataRows = () => within(screen.getByRole('table', { name: 'Nhật ký kiểm toán' })).getAllByRole('row').slice(1)

describe('AdminAuditLogsPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải nhật ký kiểm toán')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/admin/audit-logs', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })

  it('render_NoLogs_ShowsEmptyMessage', async () => {
    server.use(http.get('*/api/admin/audit-logs', () => HttpResponse.json({ page: 1, pageSize: 20, items: [] })))
    renderPage()
    expect(await screen.findByText('Không có bản ghi phù hợp.')).toBeInTheDocument()
  })
})

describe('AdminAuditLogsPage table', () => {
  it('render_Ready_ShowsNewestFirstWithActorEmailAndVietnameseLabels', async () => {
    renderPage()
    await waitForPage()
    const rows = dataRows()
    expect(rows).toHaveLength(12)
    expect(within(rows[0]).getByText('owner@example.com')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Đăng nhập')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Thành công')).toBeInTheDocument()
  })

  it('render_AdminActionAfterUserUpdate_AppearsAtTop', async () => {
    await axiosClient.put('/admin/users/2/status', { status: 'Locked' })
    renderPage()
    await waitForPage()
    const first = dataRows()[0]
    expect(within(first).getByText('admin@example.com')).toBeInTheDocument()
    expect(within(first).getByText('Admin đổi trạng thái người dùng')).toBeInTheDocument()
    expect(within(first).getByText('Tài khoản #2')).toBeInTheDocument()
  })

  it('render_LogWithoutUser_ShowsSystemActor', async () => {
    server.use(
      http.get('*/api/admin/audit-logs', () =>
        HttpResponse.json({
          page: 1,
          pageSize: 20,
          items: [{ logId: 1, userId: null, userEmail: null, action: 'Login', entityType: null, entityId: null, result: 'Failed', ipaddress: null, timestamp: '2026-05-01T08:00:00Z' }],
        }),
      ),
    )
    renderPage()
    await waitForPage()
    const row = dataRows()[0]
    expect(within(row).getByText('Hệ thống')).toBeInTheDocument()
    expect(within(row).getByText('Thất bại')).toBeInTheDocument()
  })
})

describe('AdminAuditLogsPage filter and paging', () => {
  it('filter_ByAction_ShowsOnlyThatAction', async () => {
    renderPage()
    await waitForPage()
    await userEvent.selectOptions(screen.getByLabelText('Lọc theo thao tác'), 'CreateAsset')
    await screen.findAllByText('Tạo tài sản')
    expect(dataRows()).toHaveLength(2)
    expect(dataRows().every((row) => within(row).queryByText('Tạo tài sản'))).toBe(true)
  })

  it('filter_ActionWithoutLogs_ShowsEmptyMessage', async () => {
    renderPage()
    await waitForPage()
    await userEvent.selectOptions(screen.getByLabelText('Lọc theo thao tác'), 'AdminCreateUser')
    expect(await screen.findByText('Không có bản ghi phù hợp.')).toBeInTheDocument()
  })

  it('pager_FullFirstPage_AllowsNextPage', async () => {
    renderPage()
    await waitForPage()
    await userEvent.selectOptions(screen.getByLabelText('Số lượng'), '10')
    expect(await screen.findByText('Trang 1')).toBeInTheDocument()
    await screen.findAllByRole('row')
    expect(screen.getByRole('button', { name: /Tiếp/ })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: /Tiếp/ }))
    expect(await screen.findByText('Trang 2')).toBeInTheDocument()
    await within(screen.getByRole('table', { name: 'Nhật ký kiểm toán' })).findAllByRole('row')
    expect(dataRows()).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Tiếp/ })).toBeDisabled()
  })

  it('refresh_Click_ReloadsLogs', async () => {
    renderPage()
    await waitForPage()
    await axiosClient.put('/admin/users/2/status', { status: 'Disabled' })
    await userEvent.click(screen.getByRole('button', { name: 'Làm mới' }))
    expect(await screen.findByText('Admin đổi trạng thái người dùng')).toBeInTheDocument()
  })
})
