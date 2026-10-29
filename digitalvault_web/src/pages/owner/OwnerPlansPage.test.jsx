import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { DEMO_ACCOUNT, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import { redirectTo } from '../../utils/navigation'
import OwnerPlansPage from './OwnerPlansPage'

vi.mock('../../utils/navigation', () => ({ redirectTo: vi.fn() }))

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  redirectTo.mockReset()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = (props = {}) => renderWithProviders(<OwnerPlansPage mockMode="off" {...props} />)
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Gói dịch vụ' })
const plan = (name) => screen.getByRole('article', { name })

describe('OwnerPlansPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải các gói dịch vụ')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/payments/plans', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('article', { name: 'Cơ bản' })).toBeInTheDocument()
  })

  it('render_NoPlans_ShowsEmptyMessage', async () => {
    server.use(http.get('*/api/payments/plans', () => HttpResponse.json([])))
    renderPage()
    expect(await screen.findByText('Hiện chưa có gói dịch vụ nào đang bán.')).toBeInTheDocument()
  })
})

describe('OwnerPlansPage content', () => {
  it('render_Plans_ShowsEachPlanWithPriceDurationVaultsAndStorage', async () => {
    renderPage()
    await waitForPage()
    await screen.findByRole('article', { name: 'Cơ bản' })
    expect(screen.getAllByRole('article')).toHaveLength(3)
    const basic = plan('Cơ bản')
    expect(basic).toHaveTextContent('99.000 ₫')
    expect(basic).toHaveTextContent('1 tháng')
    expect(basic).toHaveTextContent('1 kho')
    expect(basic).toHaveTextContent('1 GB')
    const family = plan('Gia đình')
    expect(family).toHaveTextContent('899.000 ₫')
    expect(family).toHaveTextContent('1 năm')
    expect(family).toHaveTextContent('20 kho')
    expect(family).toHaveTextContent('50 GB')
  })

  it('render_Info_ExplainsNewPlanReplacesOldOneAfterSuccessfulPayment', async () => {
    renderPage()
    await waitForPage()
    expect(await screen.findByText(/gói đang dùng sẽ hết hạn/)).toBeInTheDocument()
  })

  it('render_FullMock_ShowsMockNotice', async () => {
    renderPage({ mockMode: 'full' })
    await waitForPage()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})

describe('OwnerPlansPage checkout', () => {
  it('pay_Click_CreatesCheckoutAndRedirectsBrowserToPaymentUrl', async () => {
    renderPage()
    await waitForPage()
    await screen.findByRole('article', { name: 'Nâng cao' })
    await userEvent.click(within(plan('Nâng cao')).getByRole('button', { name: 'Thanh toán qua VNPay' }))
    await vi.waitFor(() => expect(redirectTo).toHaveBeenCalledTimes(1))
    expect(redirectTo.mock.calls[0][0]).toContain('/payment/mock-vnpay')
    const stored = getDb().paymentTransactions
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ planId: 2, status: 'Pending' })
  })

  it('pay_WhileProcessing_DisablesAllPayButtons', async () => {
    server.use(
      http.post('*/api/payments/vnpay/checkout', async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
        return HttpResponse.json({ transactionCode: 'T1', amount: 99000, paymentUrl: 'https://vnpay.example/pay' })
      }),
    )
    renderPage()
    await waitForPage()
    await screen.findByRole('article', { name: 'Cơ bản' })
    await userEvent.click(within(plan('Cơ bản')).getByRole('button', { name: 'Thanh toán qua VNPay' }))
    expect(within(plan('Cơ bản')).getByRole('button', { name: 'Đang chuyển tới VNPay...' })).toBeDisabled()
    expect(within(plan('Gia đình')).getByRole('button', { name: 'Thanh toán qua VNPay' })).toBeDisabled()
    await vi.waitFor(() => expect(redirectTo).toHaveBeenCalledWith('https://vnpay.example/pay'))
  })

  it('pay_GatewayNotConfigured_ShowsErrorAndDoesNotRedirect', async () => {
    server.use(http.post('*/api/payments/vnpay/checkout', () => HttpResponse.json({ status: 503, detail: 'VNPay is not configured.' }, { status: 503 })))
    renderPage()
    await waitForPage()
    await screen.findByRole('article', { name: 'Cơ bản' })
    await userEvent.click(within(plan('Cơ bản')).getByRole('button', { name: 'Thanh toán qua VNPay' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa được cấu hình')
    expect(redirectTo).not.toHaveBeenCalled()
    expect(within(plan('Cơ bản')).getByRole('button', { name: 'Thanh toán qua VNPay' })).toBeEnabled()
  })
})
