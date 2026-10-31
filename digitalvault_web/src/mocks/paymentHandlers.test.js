import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, getDb, resetMockDb } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const call = async (promise) => {
  try {
    const response = await promise
    return { status: response.status, data: response.data }
  } catch (error) {
    return { status: error.status, message: error.message }
  }
}

// Tham số VNPay gửi về trình duyệt sau khi khách thanh toán (chữ ký giả lập)
const gatewayParams = (transactionCode, amount, overrides = {}) => ({
  vnp_TxnRef: transactionCode,
  vnp_Amount: String(amount * 100),
  vnp_ResponseCode: '00',
  vnp_TransactionStatus: '00',
  vnp_SecureHash: 'mock-signature',
  ...overrides,
})

const checkout = async (planId = 1) => (await call(axiosClient.post('/payments/vnpay/checkout', { planId }))).data

describe('mock payment plans', () => {
  it('getPlans_Default_ReturnsActivePlansCheapestFirst', async () => {
    const { status, data } = await call(axiosClient.get('/payments/plans'))
    expect(status).toBe(200)
    expect(data.length).toBeGreaterThanOrEqual(2)
    expect(data[0]).toEqual(expect.objectContaining({ planId: expect.any(Number), planName: expect.any(String), maxVaults: expect.any(Number), maxStorageBytes: expect.any(Number), price: expect.any(Number), durationDays: expect.any(Number) }))
    expect(data.map((plan) => plan.price)).toEqual([...data.map((plan) => plan.price)].sort((a, b) => a - b))
  })

  it('getPlans_NotLoggedIn_StillReturnsPlans', async () => {
    sessionStorage.clear()
    localStorage.clear()
    expect((await call(axiosClient.get('/payments/plans'))).status).toBe(200)
  })
})

describe('mock vnpay checkout', () => {
  it('checkout_ValidPlan_ReturnsCodeAmountAndPaymentUrl', async () => {
    const { status, data } = await call(axiosClient.post('/payments/vnpay/checkout', { planId: 1 }))
    expect(status).toBe(200)
    const plan = (await call(axiosClient.get('/payments/plans'))).data.find((item) => item.planId === 1)
    expect(data.amount).toBe(plan.price)
    expect(data.transactionCode).toMatch(/^[0-9a-f]{32}$/)
    expect(data.paymentUrl).toContain('/payment/mock-vnpay')
    expect(data.paymentUrl).toContain(`vnp_TxnRef=${data.transactionCode}`)
  })

  it('checkout_Created_StoresPendingTransaction', async () => {
    const created = await checkout(1)
    expect(getDb().paymentTransactions.find((item) => item.transactionCode === created.transactionCode)).toMatchObject({ status: 'Pending', planId: 1, userId: DEMO_ACCOUNT.userId })
  })

  it('checkout_UnknownPlan_Returns404', async () => {
    expect((await call(axiosClient.post('/payments/vnpay/checkout', { planId: 999 }))).status).toBe(404)
  })

  it('checkout_InvalidBody_Returns400', async () => {
    expect((await call(axiosClient.post('/payments/vnpay/checkout', { planId: 'abc' }))).status).toBe(400)
    expect((await call(axiosClient.post('/payments/vnpay/checkout', { planId: 1, extra: 1 }))).status).toBe(400)
  })

  it('checkout_NotLoggedIn_Returns401', async () => {
    sessionStorage.clear()
    localStorage.clear()
    expect((await call(axiosClient.post('/payments/vnpay/checkout', { planId: 1 }))).status).toBe(401)
  })
})

describe('mock vnpay return', () => {
  it('return_SuccessCodes_MarksTransactionSuccess', async () => {
    const created = await checkout()
    const { status, data } = await call(axiosClient.get('/payments/vnpay/return', { params: gatewayParams(created.transactionCode, created.amount) }))
    expect(status).toBe(200)
    expect(data).toEqual({ transactionCode: created.transactionCode, status: 'Success', amount: created.amount })
  })

  it('return_FailureCodes_MarksTransactionFailed', async () => {
    const created = await checkout()
    const { data } = await call(axiosClient.get('/payments/vnpay/return', { params: gatewayParams(created.transactionCode, created.amount, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }) }))
    expect(data.status).toBe('Failed')
  })

  it('return_RepeatedCallback_IsIdempotent', async () => {
    const created = await checkout()
    const params = gatewayParams(created.transactionCode, created.amount)
    await call(axiosClient.get('/payments/vnpay/return', { params }))
    const second = await call(axiosClient.get('/payments/vnpay/return', { params }))
    expect(second.status).toBe(200)
    expect(second.data.status).toBe('Success')
  })

  it('return_SuccessAfterFailed_Returns409', async () => {
    const created = await checkout()
    await call(axiosClient.get('/payments/vnpay/return', { params: gatewayParams(created.transactionCode, created.amount, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }) }))
    const { status } = await call(axiosClient.get('/payments/vnpay/return', { params: gatewayParams(created.transactionCode, created.amount) }))
    expect(status).toBe(409)
  })

  it('return_BadSignature_Returns400', async () => {
    const created = await checkout()
    const { status } = await call(axiosClient.get('/payments/vnpay/return', { params: gatewayParams(created.transactionCode, created.amount, { vnp_SecureHash: 'sai' }) }))
    expect(status).toBe(400)
  })

  it('return_AmountMismatch_Returns400', async () => {
    const created = await checkout()
    const { status } = await call(axiosClient.get('/payments/vnpay/return', { params: gatewayParams(created.transactionCode, created.amount + 1) }))
    expect(status).toBe(400)
  })

  it('return_IncompleteParams_Returns400', async () => {
    const created = await checkout()
    const params = gatewayParams(created.transactionCode, created.amount)
    delete params.vnp_ResponseCode
    expect((await call(axiosClient.get('/payments/vnpay/return', { params }))).status).toBe(400)
  })

  it('return_UnknownTransaction_Returns404', async () => {
    expect((await call(axiosClient.get('/payments/vnpay/return', { params: gatewayParams('khong-co', 1000) }))).status).toBe(404)
  })

  it('return_NotLoggedIn_StillVerifiesBecauseEndpointIsAnonymous', async () => {
    const created = await checkout()
    sessionStorage.clear()
    localStorage.clear()
    const { status, data } = await call(axiosClient.get('/payments/vnpay/return', { params: gatewayParams(created.transactionCode, created.amount) }))
    expect(status).toBe(200)
    expect(data.status).toBe('Success')
  })
})
