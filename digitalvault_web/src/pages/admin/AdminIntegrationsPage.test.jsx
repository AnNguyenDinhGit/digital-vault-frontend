import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIntegrations, pingIntegration } from '../../callapi/adminApi'
import AdminIntegrationsPage from './AdminIntegrationsPage'

vi.mock('../../callapi/adminApi', () => ({ getIntegrations: vi.fn(), pingIntegration: vi.fn() }))

const service = (serviceId, serviceName, status, extra = {}) => ({
  serviceId,
  serviceName,
  serviceType: 'eKYC',
  provider: 'VNPT AI',
  status,
  latencyMs: 120,
  lastCheckedAt: '2026-10-29T14:00:00Z',
  endpointUrl: `https://api.example.com/${serviceId}`,
  errorMessage: null,
  ...extra,
})

const services = [
  service('ekyc-vnpt', 'eKYC VNPT', 'Connected', { endpointUrl: 'https://api.vnpt.vn/ekyc/v1' }),
  service('ca-vnpt', 'Chữ ký số VNPT-CA', 'Connected', { serviceType: 'DigitalSignature' }),
  service('smtp', 'SMTP Relay', 'Disconnected', { errorMessage: 'Connection refused' }),
  service('blob', 'Azure Blob Storage', 'Degraded'),
]

describe('AdminIntegrationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getIntegrations.mockResolvedValue(services)
  })

  it('page_Loaded_ShowsTitleSummaryAndEveryServiceWithStatusBadge', async () => {
    render(<AdminIntegrationsPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Trạng thái tích hợp dịch vụ' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Danh sách dịch vụ tích hợp' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('2/4 dịch vụ đang kết nối')).toBeInTheDocument()

    const ekyc = within(list).getByRole('listitem', { name: /eKYC/ })
    expect(ekyc).toHaveTextContent('Đã kết nối')
    expect(ekyc).toHaveTextContent('https://api.vnpt.vn/ekyc/v1')
    expect(within(list).getByRole('listitem', { name: /SMTP/ })).toHaveTextContent('Mất kết nối')
    expect(within(list).getByRole('listitem', { name: /SMTP/ })).toHaveTextContent('Connection refused')
    expect(within(list).getByRole('listitem', { name: /Azure/ })).toHaveTextContent('Chậm hoặc không ổn định')
  })

  it('page_ApiFails_ShowsErrorAndRetryReloads', async () => {
    getIntegrations.mockRejectedValueOnce(new Error('Máy chủ đang bận.'))
    render(<AdminIntegrationsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('list', { name: 'Danh sách dịch vụ tích hợp' })).toBeInTheDocument()
  })

  it('ping_Service_ShowsSuccessMessageAndLatencyInsideThatCard', async () => {
    pingIntegration.mockResolvedValue({ serviceId: 'ca-vnpt', success: true, latencyMs: 27, message: 'Kết nối thành công.', testedAt: '2026-10-29T14:05:00Z' })
    render(<AdminIntegrationsPage />)
    const card = await screen.findByRole('listitem', { name: /Chữ ký số/ })
    fireEvent.click(within(card).getByRole('button', { name: 'Kiểm tra kết nối' }))
    expect(await within(card).findByText(/Kết nối thành công/)).toBeInTheDocument()
    expect(within(card).getByText(/27 ms/)).toBeInTheDocument()
    expect(pingIntegration).toHaveBeenCalledWith('ca-vnpt')
  })

  it('ping_FailedResultFromServer_ShowsFailureNotSuccess', async () => {
    pingIntegration.mockResolvedValue({ serviceId: 'smtp', success: false, latencyMs: 0, message: 'Hết thời gian chờ.', testedAt: '2026-10-29T14:05:00Z' })
    render(<AdminIntegrationsPage />)
    const card = await screen.findByRole('listitem', { name: /SMTP/ })
    fireEvent.click(within(card).getByRole('button', { name: 'Kiểm tra kết nối' }))
    expect(await within(card).findByRole('alert')).toHaveTextContent('Hết thời gian chờ.')
  })

  it('ping_ApiFails_ShowsErrorInsideThatCardOnly', async () => {
    pingIntegration.mockRejectedValue({ status: 404, message: 'x' })
    render(<AdminIntegrationsPage />)
    const card = await screen.findByRole('listitem', { name: /eKYC/ })
    fireEvent.click(within(card).getByRole('button', { name: 'Kiểm tra kết nối' }))
    expect(await within(card).findByRole('alert')).toHaveTextContent('Không tìm thấy dịch vụ')
    expect(within(screen.getByRole('listitem', { name: /Chữ ký số/ })).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ping_InProgress_DisablesButtonAndShowsChecking', async () => {
    pingIntegration.mockReturnValue(new Promise(() => {}))
    render(<AdminIntegrationsPage />)
    const card = await screen.findByRole('listitem', { name: /eKYC/ })
    fireEvent.click(within(card).getByRole('button', { name: 'Kiểm tra kết nối' }))
    expect(await within(card).findByRole('button', { name: 'Đang kiểm tra...' })).toBeDisabled()
  })
})
