import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { ROLE_ACCOUNTS, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import AdminPlansPage from './AdminPlansPage'

const server = setupServer(...handlers)
const admin = ROLE_ACCOUNTS.find((account) => account.role === 'Admin')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(admin.email, admin.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<AdminPlansPage mockMode="off" />)
const waitForTable = () => screen.findByRole('table', { name: 'Danh mục gói dịch vụ' })

describe('AdminPlansPage', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải danh mục gói dịch vụ')
    await waitForTable()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/payments/plans', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForTable()).toBeInTheDocument()
  })

  it('render_NoPlans_ShowsEmptyMessage', async () => {
    server.use(http.get('*/api/payments/plans', () => HttpResponse.json([])))
    renderPage()
    expect(await screen.findByText('Chưa có gói dịch vụ nào đang bán.')).toBeInTheDocument()
  })

  it('render_Plans_ShowsOneRowPerPlanWithLimitsPriceAndDuration', async () => {
    renderPage()
    const table = await waitForTable()
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Cơ bản')
    expect(rows[0]).toHaveTextContent('1 kho')
    expect(rows[0]).toHaveTextContent('1 GB')
    expect(rows[0]).toHaveTextContent('99.000 ₫')
    expect(rows[0]).toHaveTextContent('1 tháng')
  })

  it('render_Page_ExplainsTransactionsHaveNoApiYetAndIsReadOnly', async () => {
    renderPage()
    await waitForTable()
    expect(screen.getByText(/chưa có API xem giao dịch/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Thanh toán/ })).not.toBeInTheDocument()
  })

  it('render_FullMock_ShowsMockNotice', async () => {
    renderWithProviders(<AdminPlansPage mockMode="full" />)
    await waitForTable()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})
