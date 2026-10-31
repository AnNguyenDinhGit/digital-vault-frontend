import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { renderWithProviders } from '../../test/renderWithProviders'
import MockVnpayGatewayPage from './MockVnpayGatewayPage'

// Hiện địa chỉ trang đích để kiểm tra các tham số mà cổng giả lập gửi về
function ReturnProbe() {
  const { pathname, search } = useLocation()
  return <p data-testid="return-url">{`${pathname}${search}`}</p>
}

const renderPage = (route = '/payment/mock-vnpay?vnp_TxnRef=GD0001&vnp_Amount=9900000&vnp_OrderInfo=Payment+for+C%C6%A1+b%E1%BA%A3n') =>
  renderWithProviders(<MockVnpayGatewayPage />, {
    route,
    path: '/payment/mock-vnpay',
    extraRoutes: [{ path: '/payment/vnpay-return', element: <ReturnProbe /> }],
  })

const returnParams = async () => {
  const url = new URL(`http://x${(await screen.findByTestId('return-url')).textContent}`)
  expect(url.pathname).toBe('/payment/vnpay-return')
  return Object.fromEntries(url.searchParams)
}

const TEST_CARD = { number: '9704198526191432198', holder: 'NGUYEN VAN A', date: '07/15' }

// Đi qua bước chọn phương thức, ngân hàng và nhập thẻ nội địa
async function fillDomesticCard({ bank = 'NCB', number = TEST_CARD.number, holder = TEST_CARD.holder, date = TEST_CARD.date } = {}) {
  await userEvent.click(screen.getByRole('button', { name: /Thẻ nội địa và tài khoản ngân hàng/ }))
  await userEvent.click(screen.getByRole('button', { name: bank }))
  await userEvent.type(screen.getByLabelText('Số thẻ'), number)
  await userEvent.type(screen.getByLabelText('Tên chủ thẻ'), holder)
  await userEvent.type(screen.getByLabelText('Ngày phát hành'), date)
  await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
}

const enterOtp = async (code) => {
  const input = screen.getByLabelText('Mã OTP')
  await userEvent.clear(input)
  await userEvent.type(input, code)
  await userEvent.click(screen.getByRole('button', { name: 'Thanh toán' }))
}

describe('MockVnpayGatewayPage order and methods', () => {
  it('render_OrderInQuery_ShowsSimulatedGatewayWithOrderDetailsAndMethods', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Cổng thanh toán VNPay (giả lập)' })).toBeInTheDocument()
    expect(screen.getByText('GD0001')).toBeInTheDocument()
    expect(screen.getByText('99.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('Payment for Cơ bản')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ứng dụng hỗ trợ VNPAY-QR/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thẻ nội địa và tài khoản ngân hàng/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thẻ thanh toán quốc tế/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Thời gian còn lại')).toHaveTextContent('15:00')
  })

  it('cancel_Click_ReturnsWithCustomerCancelCode', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy giao dịch' }))
    const params = await returnParams()
    expect(params.vnp_ResponseCode).toBe('24')
    expect(params.vnp_TransactionStatus).toBe('02')
  })

  it('render_MissingOrder_ShowsErrorAndDisablesActions', () => {
    renderPage('/payment/mock-vnpay')
    expect(screen.getByRole('alert')).toHaveTextContent('Thiếu thông tin đơn hàng')
    expect(screen.getByRole('button', { name: 'Hủy giao dịch' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Thẻ nội địa/ })).not.toBeInTheDocument()
  })
})

describe('MockVnpayGatewayPage domestic card', () => {
  it('pay_TestCardAndCorrectOtp_ReturnsWithSuccessCodesAndMockSignature', async () => {
    renderPage()
    await fillDomesticCard()
    expect(screen.getByRole('heading', { name: 'Xác thực OTP' })).toBeInTheDocument()
    await enterOtp('123456')
    expect(await returnParams()).toEqual({
      vnp_TxnRef: 'GD0001',
      vnp_Amount: '9900000',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_SecureHash: 'mock-signature',
    })
  })

  it('card_WrongDetails_ShowsErrorAndStaysOnForm', async () => {
    renderPage()
    await fillDomesticCard({ holder: 'TRAN VAN B' })
    expect(screen.getByRole('alert')).toHaveTextContent('Thông tin thẻ không chính xác.')
    expect(screen.getByLabelText('Số thẻ')).toBeInTheDocument()
  })

  it('card_OtherBank_SaysCardDoesNotBelongToBank', async () => {
    renderPage()
    await fillDomesticCard({ bank: 'Vietcombank' })
    expect(screen.getByRole('alert')).toHaveTextContent('Thẻ không thuộc ngân hàng Vietcombank.')
  })

  it('card_InsufficientFunds_ReturnsWithCode51', async () => {
    renderPage()
    await fillDomesticCard({ number: '9704195798459170488' })
    const params = await returnParams()
    expect(params.vnp_ResponseCode).toBe('51')
    expect(params.vnp_TransactionStatus).toBe('02')
  })

  it('otp_WrongOnce_ShowsRemainingAttempts', async () => {
    renderPage()
    await fillDomesticCard()
    await enterOtp('000000')
    expect(screen.getByRole('alert')).toHaveTextContent('Bạn còn 2 lần thử')
  })

  it('otp_WrongThreeTimes_ReturnsWithCode13', async () => {
    renderPage()
    await fillDomesticCard()
    await enterOtp('000000')
    await enterOtp('111111')
    await enterOtp('222222')
    const params = await returnParams()
    expect(params.vnp_ResponseCode).toBe('13')
    expect(params.vnp_TransactionStatus).toBe('02')
  })
})

describe('MockVnpayGatewayPage other methods', () => {
  it('international_ValidCardAndOtp_ReturnsSuccess', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Thẻ thanh toán quốc tế/ }))
    await userEvent.type(screen.getByLabelText('Số thẻ'), '4111111111111111')
    await userEvent.type(screen.getByLabelText('Tên chủ thẻ'), 'NGUYEN VAN A')
    await userEvent.type(screen.getByLabelText('Ngày hết hạn'), '12/99')
    await userEvent.type(screen.getByLabelText('CVV'), '123')
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    await enterOtp('123456')
    expect((await returnParams()).vnp_ResponseCode).toBe('00')
  })

  it('international_InvalidNumber_ShowsError', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Thẻ thanh toán quốc tế/ }))
    await userEvent.type(screen.getByLabelText('Số thẻ'), '4111111111111112')
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Số thẻ không hợp lệ.')
  })

  it('qr_SimulateScan_ReturnsSuccess', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Ứng dụng hỗ trợ VNPAY-QR/ }))
    expect(screen.getByRole('figure', { name: 'Mã VNPAY-QR giả lập' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mô phỏng: đã quét mã và thanh toán' }))
    expect((await returnParams()).vnp_ResponseCode).toBe('00')
  })

  it('back_FromBankList_ReturnsToMethodChoice', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: /Thẻ nội địa và tài khoản ngân hàng/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(screen.getByRole('heading', { name: 'Chọn phương thức thanh toán' })).toBeInTheDocument()
  })
})
