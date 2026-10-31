import { isFreePlan, needsGatewayRedirect, PAYMENT_METHODS, planAction } from './payment'

const free = { planId: 1, price: 0 }
const standard = { planId: 2, price: 99000 }
const premium = { planId: 3, price: 299000 }

describe('planAction', () => {
  it('freePlan_NoCurrentPlan_OffersFreeSignUp', () => {
    expect(planAction(free, null)).toEqual({ label: 'Dùng miễn phí', primary: true })
    expect(isFreePlan(free)).toBe(true)
  })

  it('freePlan_AlreadyCurrent_ReturnsNullBecauseNothingToDo', () => {
    expect(planAction(free, free)).toBeNull()
  })

  it('freePlan_WhilePaidPlanActive_OffersSwitch', () => {
    expect(planAction(free, standard)).toEqual({ label: 'Chuyển gói', primary: false })
  })

  it('needsGatewayRedirect_EmptyOrMissingUrl_IsFalse', () => {
    expect(needsGatewayRedirect({ paymentUrl: 'https://sandbox.vnpayment.vn/pay' })).toBe(true)
    expect(needsGatewayRedirect({ paymentUrl: '' })).toBe(false)
    expect(needsGatewayRedirect({ paymentUrl: '   ' })).toBe(false)
    expect(needsGatewayRedirect({ paymentUrl: null })).toBe(false)
    expect(needsGatewayRedirect(undefined)).toBe(false)
  })

  it('noCurrentPlan_OffersBuy', () => {
    expect(planAction(standard, null)).toEqual({ label: 'Mua gói', primary: true })
  })

  it('currentPlanIsFree_OffersBuy', () => {
    expect(planAction(premium, free)).toEqual({ label: 'Mua gói', primary: true })
  })

  it('samePlan_OffersRenew', () => {
    expect(planAction(standard, standard)).toEqual({ label: 'Gia hạn gói', primary: false })
  })

  it('pricierPlan_OffersUpgrade', () => {
    expect(planAction(premium, standard)).toEqual({ label: 'Nâng cấp', primary: true })
  })

  it('cheaperPlan_OffersSwitch', () => {
    expect(planAction(standard, premium)).toEqual({ label: 'Chuyển gói', primary: false })
  })
})

describe('PAYMENT_METHODS', () => {
  it('onlyVnpayIsAvailable_MatchingBackendApi', () => {
    expect(PAYMENT_METHODS.filter((method) => method.available).map((method) => method.value)).toEqual(['VNPay'])
    expect(PAYMENT_METHODS.map((method) => method.value)).toEqual(['VNPay', 'MoMo', 'BankTransfer'])
  })
})

