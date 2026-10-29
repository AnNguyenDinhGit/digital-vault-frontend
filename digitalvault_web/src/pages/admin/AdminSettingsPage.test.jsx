import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { ROLE_ACCOUNTS, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import AdminSettingsPage from './AdminSettingsPage'

const server = setupServer(...handlers)
const admin = ROLE_ACCOUNTS.find((account) => account.role === 'Admin')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(admin.email, admin.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<AdminSettingsPage mockMode="off" />)
const waitForForm = () => screen.findByLabelText('Chu kỳ xoay khóa (ngày)')
const save = () => screen.getByRole('button', { name: 'Lưu cấu hình' })
const setNumber = async (label, value) => {
  const input = screen.getByLabelText(label)
  await userEvent.clear(input)
  await userEvent.type(input, String(value))
}

describe('AdminSettingsPage system config loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải cấu hình hệ thống')
    await waitForForm()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/admin/system/config', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForForm()).toBeInTheDocument()
  })
})

describe('AdminSettingsPage system config form', () => {
  it('render_Ready_ShowsCurrentValuesOfAllFourPolicies', async () => {
    renderPage()
    await waitForForm()
    expect(screen.getByLabelText('Chu kỳ xoay khóa (ngày)')).toHaveValue(90)
    expect(screen.getByLabelText('Độ dài mật khẩu tối thiểu')).toHaveValue(12)
    expect(screen.getByLabelText('Bắt buộc xác thực hai lớp cho Admin')).toBeChecked()
    expect(screen.getByLabelText('Chu kỳ điểm danh mặc định (ngày)')).toHaveValue(30)
    expect(screen.getByLabelText('Thời gian ân hạn (ngày)')).toHaveValue(7)
    expect(screen.getByLabelText('Cảnh báo trước khi hết ân hạn (ngày)')).toHaveValue(3)
    expect(screen.getByLabelText('Dung lượng tải lên tối đa (byte)')).toHaveValue(10485760)
    expect(screen.getByLabelText('Đuôi tệp được phép')).toHaveValue('.pdf, .png, .jpg, .jpeg, .docx')
    expect(screen.getByLabelText('Tự động sao lưu')).toBeChecked()
    expect(screen.getByLabelText('Lịch sao lưu (cron)')).toHaveValue('0 0 * * *')
    expect(screen.getByLabelText('Số ngày lưu bản sao lưu')).toHaveValue(30)
    expect(screen.getByText(/Cập nhật lần cuối/)).toHaveTextContent('admin@legacyvault.local')
  })

  it('save_NothingChanged_IsDisabled', async () => {
    renderPage()
    await waitForForm()
    expect(save()).toBeDisabled()
  })

  it('save_ChangedValues_PersistsAllPoliciesShowsToastAndNewAuthor', async () => {
    renderPage()
    await waitForForm()
    await setNumber('Thời gian ân hạn (ngày)', 10)
    await setNumber('Chu kỳ điểm danh mặc định (ngày)', 45)
    await userEvent.click(save())
    expect(await screen.findByText('Đã lưu cấu hình hệ thống')).toBeInTheDocument()
    const stored = getDb().systemConfig
    expect(stored.proofOfLifePolicy).toEqual({ defaultPingIntervalDays: 45, gracePeriodDays: 10, warningDaysBeforeGrace: 3 })
    expect(stored.encryptionPolicy.keyRotationIntervalDays).toBe(90)
    expect(screen.getByText(/Cập nhật lần cuối/)).toHaveTextContent(admin.email)
    expect(save()).toBeDisabled()
  })

  it('save_ExtensionsText_IsSplitIntoLowercaseList', async () => {
    renderPage()
    await waitForForm()
    const input = screen.getByLabelText('Đuôi tệp được phép')
    await userEvent.clear(input)
    await userEvent.type(input, '.PDF, .zip  .txt')
    await userEvent.click(save())
    await screen.findByText('Đã lưu cấu hình hệ thống')
    expect(getDb().systemConfig.storagePolicy.allowedExtensions).toEqual(['.pdf', '.zip', '.txt'])
  })

  it('save_InvalidNumber_ShowsFieldErrorAndDoesNotCallApi', async () => {
    let called = false
    server.use(
      http.put('*/api/admin/system/config', () => {
        called = true
        return HttpResponse.json({})
      }),
    )
    renderPage()
    await waitForForm()
    await setNumber('Chu kỳ xoay khóa (ngày)', 0)
    await userEvent.click(save())
    expect(await screen.findByText('Chu kỳ xoay khóa là số ngày nguyên từ 1 đến 3650.')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('save_BlankNumber_IsTreatedAsInvalid', async () => {
    renderPage()
    await waitForForm()
    await userEvent.clear(screen.getByLabelText('Số ngày lưu bản sao lưu'))
    await userEvent.click(save())
    expect(await screen.findByText('Số ngày lưu bản sao lưu là số nguyên lớn hơn 0.')).toBeInTheDocument()
  })

  it('save_WarningLongerThanGrace_ShowsCrossFieldError', async () => {
    renderPage()
    await waitForForm()
    await setNumber('Cảnh báo trước khi hết ân hạn (ngày)', 9)
    await userEvent.click(save())
    expect(await screen.findByText('Số ngày cảnh báo không được vượt quá thời gian ân hạn.')).toBeInTheDocument()
  })

  it('save_ServerFails_ShowsErrorAndKeepsEdits', async () => {
    server.use(http.put('*/api/admin/system/config', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    await waitForForm()
    await setNumber('Thời gian ân hạn (ngày)', 10)
    await userEvent.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    expect(screen.getByLabelText('Thời gian ân hạn (ngày)')).toHaveValue(10)
  })

  it('revert_AfterEdit_RestoresSavedValues', async () => {
    renderPage()
    await waitForForm()
    await setNumber('Thời gian ân hạn (ngày)', 10)
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(screen.getByLabelText('Thời gian ân hạn (ngày)')).toHaveValue(7)
    expect(save()).toBeDisabled()
  })

  it('render_FullMock_ShowsMockNotice', async () => {
    renderWithProviders(<AdminSettingsPage mockMode="full" />)
    await waitForForm()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})

describe('AdminSettingsPage integrations tab', () => {
  const openTab = async () => {
    renderPage()
    await waitForForm()
    await userEvent.click(screen.getByRole('button', { name: 'Tích hợp bên thứ ba' }))
  }

  it('openTab_Click_ListsFiveServicesWithStatusAndEndpoint', async () => {
    await openTab()
    const list = await screen.findByRole('list', { name: 'Danh sách dịch vụ tích hợp' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(5)
    const ekyc = within(list).getByRole('listitem', { name: /eKYC/ })
    expect(ekyc).toHaveTextContent('VNPT AI')
    expect(ekyc).toHaveTextContent('Đã kết nối')
    expect(ekyc).toHaveTextContent('https://api.vnpt.vn/ekyc/v1')
  })

  it('openTab_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/admin/integrations', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    await openTab()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('list', { name: 'Danh sách dịch vụ tích hợp' })).toBeInTheDocument()
  })

  it('ping_Service_ShowsSuccessMessageAndLatency', async () => {
    await openTab()
    const card = await screen.findByRole('listitem', { name: /Chữ ký số/ })
    await userEvent.click(within(card).getByRole('button', { name: 'Kiểm tra kết nối' }))
    expect(await within(card).findByText(/thành công/)).toBeInTheDocument()
    expect(within(card).getByText(/27 ms/)).toBeInTheDocument()
  })

  it('ping_ApiFails_ShowsErrorInsideThatCardOnly', async () => {
    server.use(http.post('*/api/admin/integrations/ekyc-vnpt/ping', () => HttpResponse.json({ status: 404, detail: 'x' }, { status: 404 })))
    await openTab()
    const card = await screen.findByRole('listitem', { name: /eKYC/ })
    await userEvent.click(within(card).getByRole('button', { name: 'Kiểm tra kết nối' }))
    expect(await within(card).findByRole('alert')).toHaveTextContent('Không tìm thấy dịch vụ')
    expect(within(screen.getByRole('listitem', { name: /Chữ ký số/ })).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ping_FailedResultFromServer_ShowsFailureNotSuccess', async () => {
    server.use(
      http.post('*/api/admin/integrations/ca-vnpt/ping', () =>
        HttpResponse.json({ serviceId: 'ca-vnpt', success: false, latencyMs: 0, message: 'Hết thời gian chờ.', testedAt: new Date().toISOString() }),
      ),
    )
    await openTab()
    const card = await screen.findByRole('listitem', { name: /Chữ ký số/ })
    await userEvent.click(within(card).getByRole('button', { name: 'Kiểm tra kết nối' }))
    expect(await within(card).findByRole('alert')).toHaveTextContent('Hết thời gian chờ.')
  })

  it('switchTabs_BackToConfig_ShowsForm', async () => {
    await openTab()
    await screen.findByRole('list', { name: 'Danh sách dịch vụ tích hợp' })
    await userEvent.click(screen.getByRole('button', { name: 'Cấu hình hệ thống' }))
    await waitFor(() => expect(screen.getByLabelText('Chu kỳ xoay khóa (ngày)')).toBeInTheDocument())
  })
})
