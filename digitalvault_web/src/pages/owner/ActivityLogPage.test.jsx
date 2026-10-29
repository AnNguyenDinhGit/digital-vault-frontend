import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login, register } from '../../callapi/authApi'
import { DEMO_ACCOUNT, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import { downloadTextFile } from '../../utils/download'
import ActivityLogPage from './ActivityLogPage'

vi.mock('../../utils/download', () => ({ downloadTextFile: vi.fn() }))

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  downloadTextFile.mockReset()
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<ActivityLogPage />)
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Nhật ký hoạt động' })
const dataRows = () => within(screen.getByRole('table', { name: 'Nhật ký hoạt động' })).getAllByRole('row').slice(1)

describe('ActivityLogPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải nhật ký hoạt động')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/owner/activity-logs', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })
})

describe('ActivityLogPage table', () => {
  it('render_Ready_ShowsFirstTenRowsNewestFirstWithSummary', async () => {
    renderPage()
    await waitForPage()
    const rows = dataRows()
    expect(rows).toHaveLength(10)
    expect(rows[0]).toHaveTextContent('Đăng nhập')
    expect(rows[0]).toHaveTextContent('Thành công')
    expect(screen.getByText('Hiển thị 1 - 10 trong tổng số 12 bản ghi')).toBeInTheDocument()
  })

  it('pagination_NextPage_ShowsRemainingRows', async () => {
    renderPage()
    await waitForPage()
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp' }))
    expect(dataRows()).toHaveLength(2)
    expect(screen.getByText('Hiển thị 11 - 12 trong tổng số 12 bản ghi')).toBeInTheDocument()
  })

  it('rows_FailedLogin_ShowsFailedBadgeAndIp', async () => {
    renderPage()
    await waitForPage()
    const failed = dataRows().find((row) => row.textContent.includes('Thất bại'))
    expect(failed).toHaveTextContent('113.190.234.12')
  })
})

describe('ActivityLogPage filters', () => {
  it('filter_ByAction_ShowsOnlyThatAction', async () => {
    renderPage()
    await waitForPage()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Loại thao tác' }), 'Login')
    expect(dataRows()).toHaveLength(2)
    expect(screen.getByText('Hiển thị 1 - 2 trong tổng số 2 bản ghi')).toBeInTheDocument()
  })

  it('filter_ByResultFailed_ShowsOnlyFailedRows', async () => {
    renderPage()
    await waitForPage()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Kết quả' }), 'Failed')
    expect(dataRows()).toHaveLength(1)
    expect(dataRows()[0]).toHaveTextContent('Thất bại')
  })

  it('filter_SearchByIp_ShowsMatchingRows', async () => {
    renderPage()
    await waitForPage()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm trong nhật ký' }), '113.190')
    expect(dataRows()).toHaveLength(1)
  })

  it('filter_DateRangeInFuture_ShowsEmptyMessage', async () => {
    renderPage()
    await waitForPage()
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2999-01-01' } })
    expect(screen.getByText('Không có bản ghi phù hợp.')).toBeInTheDocument()
  })

  it('filter_WideDateRange_KeepsAllRows', async () => {
    renderPage()
    await waitForPage()
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2000-01-01' } })
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2999-12-31' } })
    expect(screen.getByText('Hiển thị 1 - 10 trong tổng số 12 bản ghi')).toBeInTheDocument()
  })

  it('filter_ClearButton_RestoresAllRows', async () => {
    renderPage()
    await waitForPage()
    expect(screen.queryByRole('button', { name: 'Xóa bộ lọc' })).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Kết quả' }), 'Failed')
    await userEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(screen.getByText('Hiển thị 1 - 10 trong tổng số 12 bản ghi')).toBeInTheDocument()
  })

  it('filter_ChangingFilter_ReturnsToFirstPage', async () => {
    renderPage()
    await waitForPage()
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp' }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Kết quả' }), 'Success')
    expect(screen.getByText(/Hiển thị 1 - /)).toBeInTheDocument()
  })
})

describe('ActivityLogPage export', () => {
  it('export_Clicked_DownloadsCsvOfAllFilteredRows', async () => {
    renderPage()
    await waitForPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }))
    expect(downloadTextFile).toHaveBeenCalledTimes(1)
    const [filename, content, mime] = downloadTextFile.mock.calls[0]
    expect(filename).toBe('nhat-ky-hoat-dong.csv')
    expect(mime).toBe('text/csv;charset=utf-8')
    expect(content.split('\r\n')).toHaveLength(13)
    expect(content).toContain('Đăng nhập')
  })

  it('export_WithFilter_ExportsOnlyFilteredRows', async () => {
    renderPage()
    await waitForPage()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Kết quả' }), 'Failed')
    await userEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }))
    expect(downloadTextFile.mock.calls[0][1].split('\r\n')).toHaveLength(2)
  })

  it('export_NoRows_IsDisabled', async () => {
    renderPage()
    await waitForPage()
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2999-01-01' } })
    expect(screen.getByRole('button', { name: 'Xuất CSV' })).toBeDisabled()
  })
})

describe('ActivityLogPage without logs', () => {
  it('render_NewOwner_ShowsEmptyState', async () => {
    await register({ fullName: 'Chủ Mới', email: 'moi@example.com', phone: '', password: 'Registration123!', confirmPassword: 'Registration123!' })
    await login('moi@example.com', 'Registration123!')
    renderPage()
    expect(await screen.findByText('Chưa có hoạt động nào được ghi nhận.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
