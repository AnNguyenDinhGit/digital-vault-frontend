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

describe('MockVnpayGatewayPage', () => {
  it('render_OrderInQuery_ShowsSimulatedGatewayWithOrderDetails', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Cổng thanh toán VNPay (giả lập)' })).toBeInTheDocument()
    expect(screen.getByText('GD0001')).toBeInTheDocument()
    expect(screen.getByText('99.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('Payment for Cơ bản')).toBeInTheDocument()
  })

  it('pay_Success_ReturnsWithSuccessCodesAndMockSignature', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Thanh toán thành công' }))
    const url = new URL(`http://x${(await screen.findByTestId('return-url')).textContent}`)
    expect(url.pathname).toBe('/payment/vnpay-return')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      vnp_TxnRef: 'GD0001',
      vnp_Amount: '9900000',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_SecureHash: 'mock-signature',
    })
  })

  it('cancel_Click_ReturnsWithFailureCodes', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy giao dịch' }))
    const url = new URL(`http://x${(await screen.findByTestId('return-url')).textContent}`)
    expect(url.searchParams.get('vnp_ResponseCode')).toBe('24')
    expect(url.searchParams.get('vnp_TransactionStatus')).toBe('02')
  })

  it('render_MissingOrder_ShowsErrorAndDisablesActions', () => {
    renderPage('/payment/mock-vnpay')
    expect(screen.getByRole('alert')).toHaveTextContent('Thiếu thông tin đơn hàng')
    expect(screen.getByRole('button', { name: 'Thanh toán thành công' })).toBeDisabled()
  })
})
