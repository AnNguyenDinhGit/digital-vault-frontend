import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { DEMO_ACCOUNT, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import OwnerPlansPage from './OwnerPlansPage'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const demoUserId = () => getDb().users.find((user) => user.email === DEMO_ACCOUNT.email).userId
const DAY = 24 * 60 * 60 * 1000

const seedSubscription = (planId = 2) => {
  getDb().userSubscriptions = [
    { subscriptionId: 1, userId: demoUserId(), planId, status: 'Active', startDate: new Date(Date.now() - 10 * DAY).toISOString(), endDate: new Date(Date.now() + 20 * DAY).toISOString() },
  ]
}

const seedTransactions = () => {
  getDb().paymentTransactions = [
    { transactionId: 1, transactionCode: 'TXN-OK', userId: demoUserId(), planId: 2, planName: 'Nâng cao', amount: 499000, paymentMethod: 'VNPay', status: 'Success', createdAt: new Date(Date.now() - 2 * DAY).toISOString() },
    { transactionId: 2, transactionCode: 'TXN-FAIL', userId: demoUserId(), planId: 1, planName: 'Cơ bản', amount: 99000, paymentMethod: 'VNPay', status: 'Failed', createdAt: new Date(Date.now() - DAY).toISOString() },
  ]
}

const renderPage = (props = {}) =>
  renderWithProviders(<OwnerPlansPage mockMode="off" {...props} />, {
    extraRoutes: [{ path: '/owner/plans/:planId/checkout', element: <p>Màn hình thanh toán</p> }],
  })
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Gói dịch vụ' })
const plan = (name) => screen.getByRole('article', { name })

describe('OwnerPlansPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByText('Đang tải các gói dịch vụ...')).toBeInTheDocument()
    await screen.findByRole('article', { name: 'Cơ bản' })
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

  it('render_FreePlan_ShowsFreeLabelAndNoCheckout', async () => {
    server.use(
      http.get('*/api/payments/plans', () =>
        HttpResponse.json([{ planId: 9, planName: 'Gói Miễn Phí', maxVaults: 1, maxStorageBytes: 1073741824, price: 0, durationDays: 30 }]),
      ),
    )
    renderPage()
    await screen.findByRole('article', { name: 'Gói Miễn Phí' })
    expect(plan('Gói Miễn Phí')).toHaveTextContent('Miễn phí')
    expect(within(plan('Gói Miễn Phí')).getByRole('button', { name: 'Gói mặc định' })).toBeDisabled()
  })
})

describe('OwnerPlansPage current subscription', () => {
  it('render_NoActiveSubscription_ExplainsUserHasNoPaidPlan', async () => {
    renderPage()
    expect(await screen.findByText(/chưa có gói trả phí nào đang hiệu lực/)).toBeInTheDocument()
  })

  it('render_ActiveSubscription_ShowsPlanDaysLeftAndMarksCurrentCard', async () => {
    seedSubscription(2)
    renderPage()
    const panel = (await screen.findByRole('heading', { name: 'Gói đang sử dụng' })).closest('section')
    expect(await within(panel).findByText('Nâng cao')).toBeInTheDocument()
    expect(panel).toHaveTextContent('Đang hiệu lực')
    expect(panel).toHaveTextContent('Còn 20 ngày')
    await screen.findByRole('article', { name: 'Nâng cao' })
    expect(within(plan('Nâng cao')).getByText('Đang dùng')).toBeInTheDocument()
    expect(within(plan('Nâng cao')).getByRole('button', { name: 'Gia hạn gói' })).toHaveAttribute('href', '/owner/plans/2/checkout')
    expect(within(plan('Cơ bản')).queryByText('Đang dùng')).not.toBeInTheDocument()
  })

  it('render_NoSubscription_EveryPaidPlanOffersBuy', async () => {
    renderPage()
    await screen.findByRole('article', { name: 'Cơ bản' })
    for (const name of ['Cơ bản', 'Nâng cao', 'Gia đình']) {
      expect(within(plan(name)).getByRole('button', { name: 'Mua gói' })).toHaveAttribute('href', expect.stringContaining('/checkout'))
    }
  })

  it('render_ActiveSubscription_OffersUpgradeForPricierAndSwitchForCheaperPlans', async () => {
    seedSubscription(2)
    renderPage()
    await screen.findByText('Đang dùng')
    expect(within(plan('Gia đình')).getByRole('button', { name: 'Nâng cấp' })).toHaveAttribute('href', '/owner/plans/3/checkout')
    expect(within(plan('Cơ bản')).getByRole('button', { name: 'Chuyển gói' })).toHaveAttribute('href', '/owner/plans/1/checkout')
  })
})

describe('OwnerPlansPage navigation and history', () => {
  it('choosePlan_Click_OpensCheckoutScreenForThatPlan', async () => {
    renderPage()
    await screen.findByRole('article', { name: 'Nâng cao' })
    await userEvent.click(within(plan('Nâng cao')).getByRole('button', { name: 'Mua gói' }))
    expect(await screen.findByText('Màn hình thanh toán')).toBeInTheDocument()
  })

  it('history_Empty_ShowsEmptyMessage', async () => {
    renderPage()
    expect(await screen.findByText('Bạn chưa có giao dịch thanh toán nào.')).toBeInTheDocument()
  })

  it('history_WithTransactions_ListsNewestFirstAndFiltersByStatus', async () => {
    seedTransactions()
    renderPage()
    const table = await screen.findByRole('table', { name: 'Lịch sử thanh toán' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('TXN-FAIL')
    expect(rows[0]).toHaveTextContent('Thanh toán thất bại')
    expect(rows[1]).toHaveTextContent('TXN-OK')
    expect(rows[1]).toHaveTextContent('499.000 ₫')

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Lọc theo trạng thái giao dịch' }), 'Success')
    await vi.waitFor(() => expect(within(screen.getByRole('table', { name: 'Lịch sử thanh toán' })).getAllByRole('row')).toHaveLength(2))
    expect(screen.getByRole('table', { name: 'Lịch sử thanh toán' })).toHaveTextContent('TXN-OK')
    expect(screen.getByRole('table', { name: 'Lịch sử thanh toán' })).not.toHaveTextContent('TXN-FAIL')
  })
})
