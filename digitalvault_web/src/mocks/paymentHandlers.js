import { http, HttpResponse } from 'msw'
import { getDb, saveDb } from './db'
import { hasUnknownFields, problem, route } from './helpers'
import { MOCK_VNPAY_SIGNATURE } from './vnpayMock'

// Mock thanh toán VNPay, bám PaymentController/VnPayService của BE
const PLANS = [
  { planId: 4, planName: 'Miễn phí', maxVaults: 1, maxStorageBytes: 536870912, price: 0, durationDays: 30 },
  { planId: 1, planName: 'Cơ bản', maxVaults: 1, maxStorageBytes: 1073741824, price: 99000, durationDays: 30 },
  { planId: 2, planName: 'Nâng cao', maxVaults: 5, maxStorageBytes: 10737418240, price: 499000, durationDays: 180 },
  { planId: 3, planName: 'Gia đình', maxVaults: 20, maxStorageBytes: 53687091200, price: 899000, durationDays: 365 },
]

const DAY_MS = 24 * 60 * 60 * 1000

const transactions = () => {
  const db = getDb()
  db.paymentTransactions ??= []
  return db.paymentTransactions
}

const subscriptions = () => {
  const db = getDb()
  db.userSubscriptions ??= []
  return db.userSubscriptions
}

// Như BE: thanh toán thành công thì gói đang hiệu lực hết hạn và gói mới có hiệu lực từ bây giờ
function activateSubscription(payment) {
  const plan = PLANS.find((item) => item.planId === payment.planId)
  if (!plan) return
  const now = Date.now()
  subscriptions()
    .filter((item) => item.userId === payment.userId && item.status === 'Active')
    .forEach((item) => {
      item.status = 'Expired'
      item.endDate = new Date(now).toISOString()
    })
  const subscriptionId = subscriptions().reduce((max, item) => Math.max(max, item.subscriptionId), 0) + 1
  subscriptions().push({
    subscriptionId,
    userId: payment.userId,
    planId: plan.planId,
    status: 'Active',
    startDate: new Date(now).toISOString(),
    endDate: new Date(now + plan.durationDays * DAY_MS).toISOString(),
  })
  payment.subscriptionId = subscriptionId
}

// Mã giao dịch 32 ký tự thập lục phân như BE (yyMMddHHmmss + Guid cắt còn 32)
function newTransactionCode() {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 14)
  const random = Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  return `${stamp}${random}`
}

export const paymentHandlers = [
  http.get(
    '*/api/payments/plans',
    route(() => HttpResponse.json([...PLANS].sort((a, b) => a.price - b.price)), { auth: false }),
  ),

  // Gói đang hiệu lực của người dùng đang đăng nhập (CurrentSubscriptionDto)
  http.get(
    '*/api/payments/me/subscription',
    route(({ userId }) => {
      const now = Date.now()
      const active = subscriptions()
        .filter((item) => item.userId === userId && item.status === 'Active' && new Date(item.endDate).getTime() > now)
        .sort((a, b) => b.subscriptionId - a.subscriptionId)[0]
      if (!active) return HttpResponse.json({ hasActiveSubscription: false, subscription: null })
      const { subscriptionId, status, startDate, endDate, planId } = active
      const plan = PLANS.find((item) => item.planId === planId) ?? null
      return HttpResponse.json({ hasActiveSubscription: true, subscription: { subscriptionId, status, startDate, endDate, plan } })
    }),
  ),

  // Lịch sử giao dịch của người dùng, mới nhất trước (PaymentTransactionPageDto)
  http.get(
    '*/api/payments/me/transactions',
    route(({ request, userId }) => {
      const query = new URL(request.url).searchParams
      const page = Math.max(1, Number(query.get('page')) || 1)
      const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize')) || 20))
      const status = query.get('status')
      const mine = transactions()
        .filter((item) => item.userId === userId && (!status || item.status === status))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const items = mine.slice((page - 1) * pageSize, page * pageSize).map((item) => ({
        transactionId: item.transactionId,
        transactionCode: item.transactionCode,
        amount: item.amount,
        paymentMethod: item.paymentMethod ?? 'VNPay',
        status: item.status,
        createdAt: item.createdAt,
        subscriptionId: item.subscriptionId ?? null,
        planName: item.planName ?? PLANS.find((plan) => plan.planId === item.planId)?.planName ?? null,
      }))
      return HttpResponse.json({ page, pageSize, total: mine.length, items })
    }),
  ),

  http.post(
    '*/api/payments/vnpay/checkout',
    route(({ userId, body }) => {
      if (hasUnknownFields(body, ['planId']) || !Number.isInteger(body?.planId)) return problem(400, 'PlanId is required.')
      const plan = PLANS.find((item) => item.planId === body.planId)
      if (!plan) return problem(404, 'Subscription plan not found or inactive.')
      const free = !(plan.price > 0)
      const transactionCode = newTransactionCode()
      const payment = {
        transactionId: transactions().length + 1,
        transactionCode,
        userId,
        planId: plan.planId,
        planName: plan.planName,
        amount: plan.price,
        paymentMethod: free ? 'Free' : 'VNPay',
        status: free ? 'Success' : 'Pending',
        createdAt: new Date().toISOString(),
      }
      transactions().push(payment)
      // Như BE: gói 0đ được kích hoạt ngay trong DB và trả paymentUrl rỗng để FE không chuyển sang VNPay
      if (free) {
        activateSubscription(payment)
        saveDb()
        return HttpResponse.json({ transactionCode, amount: 0, paymentUrl: '' })
      }
      saveDb()
      const query = new URLSearchParams({ vnp_TxnRef: transactionCode, vnp_Amount: String(plan.price * 100), vnp_OrderInfo: `Payment for ${plan.planName}` })
      return HttpResponse.json({ transactionCode, amount: plan.price, paymentUrl: `/payment/mock-vnpay?${query}` })
    }),
  ),

  // Endpoint công khai: khách chưa đăng nhập vẫn xác thực được kết quả khi được VNPay đưa về
  http.get(
    '*/api/payments/vnpay/return',
    route(
      ({ request }) => {
        const query = new URL(request.url).searchParams
        if (query.get('vnp_SecureHash') !== MOCK_VNPAY_SIGNATURE) return problem(400, 'Invalid VNPay signature.')
        const reference = query.get('vnp_TxnRef')
        const amountText = query.get('vnp_Amount')
        const responseCode = query.get('vnp_ResponseCode')
        const transactionStatus = query.get('vnp_TransactionStatus')
        if (!reference || !/^\d+$/.test(amountText ?? '') || !responseCode || !transactionStatus) return problem(400, 'Incomplete VNPay callback.')

        const payment = transactions().find((item) => item.transactionCode === reference)
        if (!payment) return problem(404, 'Payment transaction not found.')
        if (Number(amountText) !== payment.amount * 100) return problem(400, 'VNPay callback does not match the payment order.')

        const success = responseCode === '00' && transactionStatus === '00'
        if (payment.status === 'Pending') {
          payment.status = success ? 'Success' : 'Failed'
          if (success) activateSubscription(payment)
          saveDb()
        } else if (success && payment.status !== 'Success') {
          return problem(409, 'Payment already has a different final status.')
        }
        return HttpResponse.json({ transactionCode: reference, status: payment.status, amount: payment.amount })
      },
      { auth: false },
    ),
  ),
]
