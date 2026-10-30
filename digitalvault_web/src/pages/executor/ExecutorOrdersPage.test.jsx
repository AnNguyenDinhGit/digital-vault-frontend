import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { createHandover } from '../../callapi/executorApi'
import { handoverCode } from '../../utils/handover'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import ExecutorOrdersPage from './ExecutorOrdersPage'

const server = setupServer(...handlers)
const EXECUTOR = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(EXECUTOR.email, EXECUTOR.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = (props = {}) =>
  renderWithProviders(<ExecutorOrdersPage mockMode="full" {...props} />, {
    extraRoutes: [{ path: '/executor/handovers/:requestId', element: <p>handover-detail-page</p> }],
  })
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Đơn bàn giao di sản' })

describe('ExecutorOrdersPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải đơn bàn giao')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/executor/assignments', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })

  it('render_FullMock_ShowsMockNotice', async () => {
    renderPage({ mockMode: 'full' })
    await waitForPage()
    expect(screen.getByRole('note')).toHaveTextContent('Dữ liệu mô phỏng')
  })

  it('render_HybridMode_HasNoMockNoticeBecauseBackendIsReal', async () => {
    renderPage({ mockMode: 'hybrid' })
    await waitForPage()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('ExecutorOrdersPage assignments', () => {
  it('assignments_Assigned_ShowsVaultWithStatusAndCreateButton', async () => {
    renderPage()
    await waitForPage()
    const section = screen.getByRole('region', { name: 'Kho được phân công' })
    expect(await within(section).findByText('Kho #1')).toBeInTheDocument()
    expect(section).toHaveTextContent('Đang hiệu lực')
    expect(within(section).getByRole('button', { name: 'Tạo hồ sơ bàn giao' })).toBeEnabled()
  })

  it('assignments_None_ShowsEmptyMessage', async () => {
    getDb().executorAssignments[1].executorId = 22
    renderPage()
    await waitForPage()
    expect(screen.getByText('Bạn chưa được phân công kho nào.')).toBeInTheDocument()
  })

  it('create_Clicked_CreatesDraftAndOpensItsDetail', async () => {
    renderPage()
    await waitForPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo hồ sơ bàn giao' }))
    expect(await screen.findByText('handover-detail-page')).toBeInTheDocument()
    expect(getDb().handovers).toHaveLength(1)
  })

  it('create_VaultAlreadyHasOpenHandover_ShowsViewLinkInsteadOfCreateButton', async () => {
    const request = await createHandover(1)
    renderPage()
    await waitForPage()
    const section = screen.getByRole('region', { name: 'Kho được phân công' })
    expect(await within(section).findByRole('link', { name: 'Xem hồ sơ' })).toHaveAttribute('href', `/executor/handovers/${request.requestId}`)
    expect(within(section).queryByRole('button', { name: 'Tạo hồ sơ bàn giao' })).not.toBeInTheDocument()
  })

  it('create_ServerConflict_ShowsReadableError', async () => {
    server.use(http.post('*/api/executor/assignments/:vaultId/handovers', () => HttpResponse.json({ status: 409, detail: 'x' }, { status: 409 })))
    renderPage()
    await waitForPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo hồ sơ bàn giao' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Kho này đã có hồ sơ bàn giao đang xử lý hoặc chưa có tài sản nào được phân bổ.')
  })

  it('create_NotAssigned403_ShowsReadableError', async () => {
    server.use(http.post('*/api/executor/assignments/:vaultId/handovers', () => HttpResponse.json({ status: 403, detail: 'x' }, { status: 403 })))
    renderPage()
    await waitForPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo hồ sơ bàn giao' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không được phân công kho này.')
  })

  it('create_ServerDown503_ShowsNoExecutorOrServerError', async () => {
    server.use(http.post('*/api/executor/assignments/:vaultId/handovers', () => HttpResponse.json({ status: 503, detail: 'Không có Executor phù hợp.' }, { status: 503 })))
    renderPage()
    await waitForPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo hồ sơ bàn giao' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không có Executor phù hợp.')
  })
})

describe('ExecutorOrdersPage handover table', () => {
  it('table_NoHandovers_ShowsEmptyMessage', async () => {
    renderPage()
    await waitForPage()
    expect(screen.getByText('Chưa có hồ sơ bàn giao nào.')).toBeInTheDocument()
  })

  it('table_WithHandover_ShowsRowWithStatusVaultAndLink', async () => {
    const request = await createHandover(1)
    renderPage()
    await waitForPage()
    const table = await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    const row = within(table).getByRole('row', { name: /HS-/ })
    expect(within(row).getByRole('link', { name: handoverCode(request) })).toHaveAttribute('href', `/executor/handovers/${request.requestId}`)
    expect(row).toHaveTextContent('Kho #1')
    expect(row).toHaveTextContent('Bản nháp')
    expect(row).toHaveTextContent('4 tài sản')
  })

  it('table_SeveralHandovers_AreSortedNewestFirst', async () => {
    const first = await createHandover(1)
    getDb().handovers[0].status = 'Cancelled'
    const second = await createHandover(1)
    renderPage()
    await waitForPage()
    const table = await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    const links = within(table).getAllByRole('link').map((link) => link.textContent)
    expect(links).toEqual([handoverCode(second), handoverCode(first)])
  })

  it('role_OwnerAccount_ShowsErrorBecauseBackendRejectsRole', async () => {
    await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
    renderPage()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
