import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login, register } from '../../callapi/authApi'
import { simulateTimePassing } from '../../callapi/ownerApi'
import { DEMO_ACCOUNT, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import ProofOfLifePage from './ProofOfLifePage'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = (props = {}, route = '/owner/proof-of-life') =>
  renderWithProviders(<ProofOfLifePage {...props} />, { route, path: '/owner/proof-of-life' })
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Điểm danh sự sống' })

const frequencyInput = () => screen.getByLabelText(/^Chu kỳ điểm danh/)
const graceInput = () => screen.getByLabelText(/^Thời gian ân hạn/)
const saveButton = () => screen.getByRole('button', { name: 'Lưu cấu hình' })

describe('ProofOfLifePage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải cấu hình điểm danh')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/owner/proof-of-life', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })
})

describe('ProofOfLifePage status card', () => {
  it('render_ActiveConfig_ShowsBadgeAndStats', async () => {
    renderPage()
    await waitForPage()
    expect(screen.getByText('Đang hoạt động')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'HẠN ĐIỂM DANH TIẾP THEO' })).toHaveTextContent('Còn 20 ngày')
    expect(within(screen.getByRole('group', { name: 'SỐ LẦN BỎ LỠ' })).getByText('0')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'LẦN ĐIỂM DANH GẦN NHẤT' })).toBeInTheDocument()
  })

  it('render_WarningState_ShowsOverdueAndGraceCountdown', async () => {
    await simulateTimePassing(25)
    renderPage()
    await waitForPage()
    expect(screen.getByText('Cảnh báo')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'HẠN ĐIỂM DANH TIẾP THEO' })).toHaveTextContent('Quá hạn 5 ngày')
    expect(screen.getByText(/Còn 2 ngày ân hạn/)).toBeInTheDocument()
  })

  it('render_TriggeredState_LocksFormAndPing', async () => {
    await simulateTimePassing(40)
    renderPage()
    await waitForPage()
    expect(screen.getByText('Đã kích hoạt')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Quy trình bàn giao đã được kích hoạt')
    expect(frequencyInput()).toBeDisabled()
    expect(saveButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: /Tôi vẫn ổn/ })).toBeDisabled()
  })

  it('render_Ready_ShowsTimelineAndInfoCard', async () => {
    renderPage()
    await waitForPage()
    const timeline = screen.getByRole('list', { name: 'Các mốc điểm danh' })
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(4)
    expect(within(timeline).getByText('Hết ân hạn: kích hoạt bàn giao')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Điều gì xảy ra khi được kích hoạt?' })).toBeInTheDocument()
  })
})

describe('ProofOfLifePage config form', () => {
  it('form_Configured_ShowsCurrentValuesAndCycleSummary', async () => {
    renderPage()
    await waitForPage()
    expect(frequencyInput()).toHaveValue(30)
    expect(graceInput()).toHaveValue(7)
    expect(screen.getByText(/tổng 37 ngày/)).toBeInTheDocument()
  })

  it('presets_ClickFrequencyPreset_UpdatesInputAndSummary', async () => {
    renderPage()
    await waitForPage()
    const group = screen.getByRole('group', { name: 'Chọn nhanh chu kỳ' })
    await userEvent.click(within(group).getByRole('button', { name: '14 ngày' }))
    expect(frequencyInput()).toHaveValue(14)
    expect(within(group).getByRole('button', { name: '14 ngày' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/trong 14 ngày/)).toBeInTheDocument()
  })

  it('presets_ClickGracePreset_UpdatesInput', async () => {
    renderPage()
    await waitForPage()
    await userEvent.click(within(screen.getByRole('group', { name: 'Chọn nhanh thời gian ân hạn' })).getByRole('button', { name: '14 ngày' }))
    expect(graceInput()).toHaveValue(14)
  })

  it('reset_Clicked_RestoresDefaultValues', async () => {
    renderPage()
    await waitForPage()
    await userEvent.clear(frequencyInput())
    await userEvent.type(frequencyInput(), '90')
    await userEvent.click(screen.getByRole('button', { name: 'Khôi phục mặc định' }))
    expect(frequencyInput()).toHaveValue(30)
    expect(graceInput()).toHaveValue(7)
  })

  it('save_NegativeFrequency_ShowsInlineErrorAndDoesNotCallApi', async () => {
    let putCalled = false
    server.use(http.put('*/api/owner/proof-of-life', () => { putCalled = true; return HttpResponse.json({}) }))
    renderPage()
    await waitForPage()
    await userEvent.clear(frequencyInput())
    await userEvent.type(frequencyInput(), '-5')
    await userEvent.click(saveButton())
    expect(screen.getByText('Chu kỳ hoặc thời gian ân hạn phải là số nguyên dương từ 1 ngày trở lên.')).toBeInTheDocument()
    expect(frequencyInput()).toHaveAttribute('aria-invalid', 'true')
    expect(putCalled).toBe(false)
  })

  it('save_ValidValues_ShowsSuccessToastAndPersists', async () => {
    renderPage()
    await waitForPage()
    await userEvent.clear(frequencyInput())
    await userEvent.type(frequencyInput(), '14')
    await userEvent.click(saveButton())
    expect(await screen.findByText('Cập nhật cấu hình thành công!')).toBeInTheDocument()
    expect(screen.getByText(/Chu kỳ mới: 14 ngày/)).toBeInTheDocument()
    expect(screen.getByText(/Tổng 21 ngày/)).toBeInTheDocument()
  })

  it('save_InProgress_ShowsProcessingButtonAndNote', async () => {
    server.use(
      http.put('*/api/owner/proof-of-life', async () => {
        await delay(300)
        return HttpResponse.json({ frequencyDays: 30, gracePeriodDays: 7, lastPingAt: new Date().toISOString(), nextPingDue: new Date().toISOString(), status: 'Active', missedCount: 0 })
      }),
    )
    renderPage()
    await waitForPage()
    await userEvent.click(saveButton())
    const processing = await screen.findByRole('button', { name: 'Đang xử lý dữ liệu...' })
    expect(processing).toBeDisabled()
    expect(screen.getByText('Đang đồng bộ cấu hình lên máy chủ...')).toBeInTheDocument()
    expect(await screen.findByText('Cập nhật cấu hình thành công!')).toBeInTheDocument()
  })

  it('save_NetworkError_ShowsConnectionBoxAndRetrySucceeds', async () => {
    server.use(http.put('*/api/owner/proof-of-life', () => HttpResponse.error(), { once: true }))
    renderPage()
    await waitForPage()
    await userEvent.click(saveButton())
    const box = await screen.findByRole('alert')
    expect(box).toHaveTextContent('Không thể kết nối đến máy chủ điểm danh')
    expect(box).toHaveTextContent('chưa được ghi nhận')
    await userEvent.click(within(box).getByRole('button', { name: 'Thử kết nối lại ngay' }))
    expect(await screen.findByText('Cập nhật cấu hình thành công!')).toBeInTheDocument()
    expect(screen.queryByText('Không thể kết nối đến máy chủ điểm danh')).not.toBeInTheDocument()
  })

  it('save_ServerRejects_ShowsServerMessageUnderForm', async () => {
    server.use(http.put('*/api/owner/proof-of-life', () => HttpResponse.json({ status: 400, detail: 'Invalid proof of life input.' }, { status: 400 })))
    renderPage()
    await waitForPage()
    await userEvent.click(saveButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Cấu hình không hợp lệ')
  })
})

describe('ProofOfLifePage not configured', () => {
  async function loginAsFreshOwner() {
    await register({ fullName: 'Chủ Mới', email: 'moi@example.com', phone: '', password: 'Registration123!', confirmPassword: 'Registration123!' })
    await login('moi@example.com', 'Registration123!')
  }

  it('render_NoConfig_ShowsNoticeAndDefaultForm', async () => {
    await loginAsFreshOwner()
    renderPage()
    expect(await screen.findByText('Bạn chưa thiết lập điểm danh sự sống.')).toBeInTheDocument()
    expect(frequencyInput()).toHaveValue(30)
    expect(graceInput()).toHaveValue(7)
    expect(screen.queryByRole('button', { name: /Tôi vẫn ổn/ })).not.toBeInTheDocument()
  })

  it('save_NoConfig_CreatesConfigAndShowsStatus', async () => {
    await loginAsFreshOwner()
    renderPage()
    await screen.findByText('Bạn chưa thiết lập điểm danh sự sống.')
    await userEvent.click(saveButton())
    expect(await screen.findByText('Cập nhật cấu hình thành công!')).toBeInTheDocument()
    expect(await screen.findByText('Đang hoạt động')).toBeInTheDocument()
    expect(screen.queryByText('Bạn chưa thiết lập điểm danh sự sống.')).not.toBeInTheDocument()
  })
})

describe('ProofOfLifePage ping', () => {
  const openConfirm = async () => {
    await userEvent.click(screen.getByRole('button', { name: /Tôi vẫn ổn/ }))
    return screen.getByRole('dialog', { name: 'Xác nhận điểm danh' })
  }

  it('ping_Confirm_ShowsSuccessToastAndClosesDialog', async () => {
    renderPage()
    await waitForPage()
    const dialog = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận điểm danh' }))
    expect(await screen.findByText('Điểm danh thành công!')).toBeInTheDocument()
    expect(screen.getByText(/gia hạn bộ đếm thêm 30 ngày/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ping_Cancel_ClosesDialogWithoutCallingApi', async () => {
    let pinged = false
    server.use(http.post('*/api/owner/proof-of-life/ping', () => { pinged = true; return HttpResponse.json({}) }))
    renderPage()
    await waitForPage()
    const dialog = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(pinged).toBe(false)
  })

  it('ping_InProgress_ShowsProcessingInsideDialog', async () => {
    server.use(
      http.post('*/api/owner/proof-of-life/ping', async () => {
        await delay(300)
        return HttpResponse.json({ frequencyDays: 30, gracePeriodDays: 7, lastPingAt: new Date().toISOString(), nextPingDue: new Date().toISOString(), status: 'Active', missedCount: 0 })
      }),
    )
    renderPage()
    await waitForPage()
    const dialog = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận điểm danh' }))
    expect(await within(dialog).findByRole('button', { name: 'Đang xử lý dữ liệu...' })).toBeDisabled()
    expect(within(dialog).getByText('Đang đồng bộ điểm danh lên máy chủ...')).toBeInTheDocument()
    expect(await screen.findByText('Điểm danh thành công!')).toBeInTheDocument()
  })

  it('ping_NetworkError_ShowsConnectionBoxInDialogAndRetrySucceeds', async () => {
    server.use(http.post('*/api/owner/proof-of-life/ping', () => HttpResponse.error(), { once: true }))
    renderPage()
    await waitForPage()
    const dialog = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận điểm danh' }))
    expect(await within(dialog).findByText('Không thể kết nối đến máy chủ điểm danh')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thử kết nối lại ngay' }))
    expect(await screen.findByText('Điểm danh thành công!')).toBeInTheDocument()
  })

  it('ping_FromQueryString_OpensConfirmDialogAutomatically', async () => {
    renderPage({}, '/owner/proof-of-life?ping=1')
    expect(await screen.findByRole('dialog', { name: 'Xác nhận điểm danh' })).toBeInTheDocument()
  })

  it('ping_FromWarningState_ResetsToActive', async () => {
    await simulateTimePassing(25)
    renderPage()
    await waitForPage()
    expect(screen.getByText('Cảnh báo')).toBeInTheDocument()
    const dialog = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận điểm danh' }))
    expect(await screen.findByText('Đang hoạt động')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'SỐ LẦN BỎ LỠ' })).getByText('1')).toBeInTheDocument()
  })
})

describe('ProofOfLifePage time simulation', () => {
  it('simulation_MockOff_IsHidden', async () => {
    renderPage({ mockMode: 'off' })
    await waitForPage()
    expect(screen.queryByRole('heading', { name: 'Mô phỏng thời gian' })).not.toBeInTheDocument()
  })

  it('simulation_MockOn_FastForwardChangesStatus', async () => {
    renderPage({ mockMode: 'hybrid' })
    await waitForPage()
    expect(screen.getByRole('heading', { name: 'Mô phỏng thời gian' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+40 ngày' }))
    await waitFor(() => expect(screen.getByText('Đã kích hoạt')).toBeInTheDocument())
  })
})
