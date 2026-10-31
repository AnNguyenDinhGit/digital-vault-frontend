import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { DEMO_ACCOUNT, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import VnpayReturnPage from './VnpayReturnPage'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Tạo một giao dịch chờ trong db mock rồi dựng địa chỉ VNPay đưa khách về
function seedTransaction(overrides = {}) {
  const db = getDb()
  db.paymentTransactions = [{ transactionCode: 'GD0001', userId: DEMO_ACCOUNT.userId, planId: 1, amount: 99000, status: 'Pending', createdAt: new Date().toISOString() }]
  const query = new URLSearchParams({
    vnp_TxnRef: 'GD0001',
    vnp_Amount: '9900000',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_SecureHash: 'mock-signature',
    ...overrides,
  })
  return `/payment/vnpay-return?${query}`
}

const renderPage = (route) =>
  renderWithProviders(<VnpayReturnPage />, {
    route,
    path: '/payment/vnpay-return',
    extraRoutes: [
      { path: '/owner/plans', element: <p>plans-page</p> },
      { path: '/', element: <p>landing-page</p> },
    ],
  })

describe('VnpayReturnPage', () => {
  it('render_WhileVerifying_ShowsLoadingStatus', async () => {
    renderPage(seedTransaction())
    expect(screen.getByRole('status')).toHaveTextContent('Đang xác thực kết quả thanh toán')
    await screen.findByRole('heading', { level: 1, name: 'Thanh toán thành công' })
  })

  it('render_SuccessResult_ShowsSuccessWithTransactionCodeAndAmount', async () => {
    renderPage(seedTransaction())
    expect(await screen.findByRole('heading', { level: 1, name: 'Thanh toán thành công' })).toBeInTheDocument()
    expect(screen.getByText('GD0001')).toBeInTheDocument()
    expect(screen.getByText('99.000 ₫')).toBeInTheDocument()
  })

  it('render_FailedResult_ShowsFailureAndNoChargeMessage', async () => {
    renderPage(seedTransaction({ vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Thanh toán thất bại' })).toBeInTheDocument()
    expect(screen.getByText(/chưa bị trừ tiền|không bị trừ tiền/)).toBeInTheDocument()
  })

  it('render_PendingResult_ShowsWaitingForConfirmation', async () => {
    server.use(http.get('*/api/payments/vnpay/return', () => HttpResponse.json({ transactionCode: 'GD0001', status: 'Pending', amount: 99000 })))
    renderPage(seedTransaction())
    expect(await screen.findByRole('heading', { level: 1, name: 'Đang chờ xác nhận' })).toBeInTheDocument()
  })

  it('render_NoGatewayParams_ShowsMissingInfoWithoutCallingApi', async () => {
    let called = false
    server.use(
      http.get('*/api/payments/vnpay/return', () => {
        called = true
        return HttpResponse.json({})
      }),
    )
    renderPage('/payment/vnpay-return?foo=bar')
    expect(await screen.findByRole('heading', { level: 1, name: 'Không có thông tin thanh toán' })).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('render_BadSignature_ShowsVerificationError', async () => {
    renderPage(seedTransaction({ vnp_SecureHash: 'sai' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không xác thực được kết quả thanh toán')
  })

  it('render_UnknownTransaction_ShowsNotFoundError', async () => {
    renderPage(seedTransaction({ vnp_TxnRef: 'KHONGCO' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy giao dịch')
  })

  it('render_VerificationFails_OffersRetry', async () => {
    server.use(http.get('*/api/payments/vnpay/return', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })), )
    renderPage(seedTransaction())
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Thanh toán thành công' })).toBeInTheDocument()
  })

  it('links_AfterResult_GoBackToPlansOrHome', async () => {
    renderPage(seedTransaction())
    await screen.findByRole('heading', { level: 1, name: 'Thanh toán thành công' })
    expect(screen.getByRole('link', { name: 'Xem các gói dịch vụ' })).toHaveAttribute('href', '/owner/plans')
    await userEvent.click(screen.getByRole('link', { name: 'Về trang chủ' }))
    expect(await screen.findByText('landing-page')).toBeInTheDocument()
  })
})

describe('VnpayReturnPage pending polling', () => {
  const renderPolling = (route, props = {}) =>
    renderWithProviders(<VnpayReturnPage pollIntervalMs={15} maxPolls={3} {...props} />, {
      route,
      path: '/payment/vnpay-return',
      extraRoutes: [{ path: '/owner/plans', element: <p>plans-page</p> }],
    })

  // Trả lần lượt các trạng thái; lần cuối lặp lại mãi, đồng thời đếm số lần BE bị gọi
  function useSequence(statuses) {
    const calls = { count: 0 }
    server.use(
      http.get('*/api/payments/vnpay/return', () => {
        const status = statuses[Math.min(calls.count, statuses.length - 1)]
        calls.count += 1
        return HttpResponse.json({ transactionCode: 'GD0001', status, amount: 99000 })
      }),
    )
    return calls
  }

  it('pending_ThenConfirmed_UpdatesToSuccessWithoutManualReload', async () => {
    const calls = useSequence(['Pending', 'Pending', 'Success'])
    renderPolling(seedTransaction())
    expect(await screen.findByRole('heading', { level: 1, name: 'Đang chờ xác nhận' })).toBeInTheDocument()
    expect(screen.getByText(/Đang tự động kiểm tra lại/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Thanh toán thành công' })).toBeInTheDocument()
    expect(calls.count).toBe(3)
    expect(screen.queryByText(/Đang tự động kiểm tra lại/)).not.toBeInTheDocument()
  })

  it('pending_ThenFailed_UpdatesToFailure', async () => {
    useSequence(['Pending', 'Failed'])
    renderPolling(seedTransaction())
    expect(await screen.findByRole('heading', { level: 1, name: 'Thanh toán thất bại' })).toBeInTheDocument()
  })

  it('pending_NeverConfirmed_StopsAfterMaxPollsAndOffersManualRecheck', async () => {
    const calls = useSequence(['Pending'])
    renderPolling(seedTransaction())
    expect(await screen.findByRole('button', { name: 'Kiểm tra lại' })).toBeInTheDocument()
    expect(screen.getByText(/VNPay chưa xác nhận giao dịch/)).toBeInTheDocument()
    expect(screen.queryByText(/Đang tự động kiểm tra lại/)).not.toBeInTheDocument()
    const stopped = calls.count
    expect(stopped).toBe(4)
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(calls.count).toBe(stopped)
  })

  it('recheck_AfterGivingUp_FetchesAgainAndShowsConfirmedResult', async () => {
    let confirmed = false
    server.use(
      http.get('*/api/payments/vnpay/return', () => HttpResponse.json({ transactionCode: 'GD0001', status: confirmed ? 'Success' : 'Pending', amount: 99000 })),
    )
    renderPolling(seedTransaction(), { maxPolls: 1 })
    const button = await screen.findByRole('button', { name: 'Kiểm tra lại' })
    confirmed = true
    await userEvent.click(button)
    expect(await screen.findByRole('heading', { level: 1, name: 'Thanh toán thành công' })).toBeInTheDocument()
  })

  it('success_FirstAnswer_DoesNotPoll', async () => {
    const calls = useSequence(['Success'])
    renderPolling(seedTransaction())
    await screen.findByRole('heading', { level: 1, name: 'Thanh toán thành công' })
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(calls.count).toBe(1)
    expect(screen.queryByRole('button', { name: 'Kiểm tra lại' })).not.toBeInTheDocument()
  })
})
