import axiosClient from './axiosClient'
import { confirmVnpayReturn, createVnpayCheckout, getPlans } from './paymentApi'

vi.mock('./axiosClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

describe('paymentApi', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('getPlans_PlainArray_ReturnsPlans', async () => {
    axiosClient.get.mockResolvedValue({ data: [{ planId: 1 }] })
    await expect(getPlans()).resolves.toEqual([{ planId: 1 }])
    expect(axiosClient.get).toHaveBeenCalledWith('/payments/plans')
  })

  it('getPlans_PageDto_ReturnsItems', async () => {
    axiosClient.get.mockResolvedValue({ data: { page: 1, pageSize: 20, items: [{ planId: 2 }] } })
    await expect(getPlans()).resolves.toEqual([{ planId: 2 }])
  })

  it('createVnpayCheckout_PlanId_PostsPlanIdAndReturnsCheckout', async () => {
    axiosClient.post.mockResolvedValue({ data: { transactionCode: 'T1', amount: 199000, paymentUrl: 'https://vnpay.example/pay' } })
    await expect(createVnpayCheckout(3)).resolves.toEqual({ transactionCode: 'T1', amount: 199000, paymentUrl: 'https://vnpay.example/pay' })
    expect(axiosClient.post).toHaveBeenCalledWith('/payments/vnpay/checkout', { planId: 3 })
  })

  it('confirmVnpayReturn_GatewayParams_ForwardsThemUnchangedAndReturnsStatus', async () => {
    axiosClient.get.mockResolvedValue({ data: { transactionCode: 'T1', status: 'Success', amount: 199000 } })
    const params = { vnp_TxnRef: 'T1', vnp_ResponseCode: '00', vnp_SecureHash: 'abc' }
    await expect(confirmVnpayReturn(params)).resolves.toEqual({ transactionCode: 'T1', status: 'Success', amount: 199000 })
    expect(axiosClient.get).toHaveBeenCalledWith('/payments/vnpay/return', { params })
  })
})
