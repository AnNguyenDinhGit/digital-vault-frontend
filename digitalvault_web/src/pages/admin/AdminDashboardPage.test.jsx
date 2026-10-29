import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { ROLE_ACCOUNTS, getDb, resetMockDb, saveDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import AdminDashboardPage from './AdminDashboardPage'

const server = setupServer(...handlers)
const admin = ROLE_ACCOUNTS.find((account) => account.role === 'Admin')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(admin.email, admin.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<AdminDashboardPage mockMode="off" />)
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Tổng quan hệ thống' })

// Ghi nhật ký thất bại gần đây để BE (mock) sinh cảnh báo
function seedFailures(count, overrides = {}) {
  getDb().activityLogs = Array.from({ length: count }, (_, index) => ({
    logId: index + 1,
    userId: 1,
    action: 'FailedLogin',
    entityType: 'User',
    entityId: 1,
    result: 'Failed',
    ipAddress: '10.0.0.1',
    timestamp: new Date().toISOString(),
    ...overrides,
  }))
  saveDb()
}

describe('AdminDashboardPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải cảnh báo an ninh')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/admin/security/alerts', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })
})

describe('AdminDashboardPage content', () => {
  it('render_NoLogsInLast24h_ShowsZerosAndNoAlertsMessage', async () => {
    seedFailures(0)
    renderPage()
    await waitForPage()
    expect(await screen.findByText('Không có cảnh báo nào trong 24 giờ qua.')).toBeInTheDocument()
    expect(screen.getByLabelText('Cảnh báo đang hoạt động')).toHaveTextContent('0')
  })

  it('render_FailuresSpike_ShowsStatsAndSeverityLabelledAlerts', async () => {
    seedFailures(5)
    renderPage()
    await waitForPage()
    const list = await screen.findByRole('list', { name: 'Danh sách cảnh báo' })
    expect(screen.getByLabelText('Thao tác trong 24 giờ')).toHaveTextContent('5')
    expect(screen.getByLabelText('Thao tác thất bại')).toHaveTextContent('5')
    expect(screen.getByLabelText('Tỷ lệ thất bại')).toHaveTextContent('100%')
    expect(screen.getByLabelText('Cảnh báo đang hoạt động')).toHaveTextContent('3')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(list).getByText('Tỷ lệ thao tác thất bại tăng bất thường')).toBeInTheDocument()
    expect(within(list).getAllByText('Nghiêm trọng').length).toBe(2)
    expect(within(list).getByText('Cảnh báo')).toBeInTheDocument()
  })

  it('render_AlertWithIpAndUser_ShowsTheirDetails', async () => {
    seedFailures(5)
    renderPage()
    await waitForPage()
    const list = await screen.findByRole('list', { name: 'Danh sách cảnh báo' })
    expect(within(list).getAllByText(/10\.0\.0\.1/).length).toBeGreaterThan(0)
  })

  it('render_OnlySuccessLogs_ShowsInfoNormalAlertWithoutCountingIt', async () => {
    seedFailures(2, { result: 'Success', action: 'Login' })
    renderPage()
    await waitForPage()
    expect(await screen.findByText('Hệ thống an toàn')).toBeInTheDocument()
    expect(screen.getByText('Thông tin')).toBeInTheDocument()
    expect(screen.getByLabelText('Cảnh báo đang hoạt động')).toHaveTextContent('0')
  })

  it('render_TopFailedActions_ShowsVietnameseActionNamesWithCounts', async () => {
    seedFailures(3, { action: 'Login' })
    renderPage()
    await waitForPage()
    const top = await screen.findByRole('list', { name: 'Thao tác thất bại nhiều nhất' })
    expect(within(top).getByText('Đăng nhập')).toBeInTheDocument()
    expect(within(top).getByText('3')).toBeInTheDocument()
  })

  it('refresh_Click_LoadsLatestAlerts', async () => {
    seedFailures(0)
    renderPage()
    await waitForPage()
    await screen.findByText('Không có cảnh báo nào trong 24 giờ qua.')
    seedFailures(5)
    await userEvent.click(screen.getByRole('button', { name: 'Làm mới' }))
    expect(await screen.findByRole('list', { name: 'Danh sách cảnh báo' })).toBeInTheDocument()
  })

  it('render_FullMock_ShowsMockNotice', async () => {
    renderWithProviders(<AdminDashboardPage mockMode="full" />)
    await waitForPage()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})
