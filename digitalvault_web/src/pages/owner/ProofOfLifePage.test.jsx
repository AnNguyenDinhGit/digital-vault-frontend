import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login, register } from '../../callapi/authApi'
import { DEMO_ACCOUNT, getDb, resetMockDb, saveDb } from '../../mocks/db'
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
const confirmButton = () => screen.getByRole('button', { name: 'Tôi vẫn còn sống' })

describe('ProofOfLifePage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải thông tin điểm danh')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/owner/life-confirmation', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })
})

describe('ProofOfLifePage content', () => {
  it('render_OwnerWithRecord_ShowsLastConfirmedTimeAndReadOnlyDefaults', async () => {
    renderPage()
    await waitForPage()
    expect(screen.getByRole('group', { name: 'LẦN XÁC NHẬN GẦN NHẤT' })).not.toHaveTextContent('Chưa xác nhận')
    expect(screen.getByRole('group', { name: 'CHU KỲ MẶC ĐỊNH' })).toHaveTextContent('30 ngày')
    expect(screen.getByRole('group', { name: 'THỜI GIAN ÂN HẠN MẶC ĐỊNH' })).toHaveTextContent('14 ngày')
    expect(screen.getByText(/chưa thể thay đổi/)).toBeInTheDocument()
  })

  it('render_OwnerNeverConfirmed_ShowsNotConfirmedYet', async () => {
    delete getDb().proofOfLife[DEMO_ACCOUNT.userId]
    saveDb()
    renderPage()
    await waitForPage()
    expect(screen.getByRole('group', { name: 'LẦN XÁC NHẬN GẦN NHẤT' })).toHaveTextContent('Bạn chưa xác nhận lần nào')
    expect(confirmButton()).toBeEnabled()
  })

  it('render_Page_HasNoConfigFormOrTimeSimulation', async () => {
    renderPage()
    await waitForPage()
    expect(screen.queryByRole('button', { name: 'Lưu cấu hình' })).not.toBeInTheDocument()
    expect(screen.queryByText('Mô phỏng thời gian')).not.toBeInTheDocument()
  })

  it('render_FullMock_ShowsMockNotice', async () => {
    renderPage({ mockMode: 'full' })
    await waitForPage()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })

  it('render_MockOff_HidesMockNotice', async () => {
    renderPage({ mockMode: 'off' })
    await waitForPage()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('ProofOfLifePage confirm alive', () => {
  it('confirm_Dialog_OpensAndCancelsWithoutCallingApi', async () => {
    renderPage()
    await waitForPage()
    const before = getDb().proofOfLife[DEMO_ACCOUNT.userId].lastPingAt
    await userEvent.click(confirmButton())
    const dialog = screen.getByRole('dialog', { name: 'Xác nhận điểm danh' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getDb().proofOfLife[DEMO_ACCOUNT.userId].lastPingAt).toBe(before)
  })

  it('confirm_Confirmed_UpdatesLastTimeAndShowsToast', async () => {
    renderPage()
    await waitForPage()
    const before = getDb().proofOfLife[DEMO_ACCOUNT.userId].lastPingAt
    await userEvent.click(confirmButton())
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận điểm danh' }))
    expect(await screen.findByText('Điểm danh thành công!')).toBeInTheDocument()
    expect(getDb().proofOfLife[DEMO_ACCOUNT.userId].lastPingAt).not.toBe(before)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirm_FirstTimeOwner_CreatesRecordAndShowsTime', async () => {
    delete getDb().proofOfLife[DEMO_ACCOUNT.userId]
    saveDb()
    renderPage()
    await waitForPage()
    await userEvent.click(confirmButton())
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận điểm danh' }))
    expect(await screen.findByText('Điểm danh thành công!')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'LẦN XÁC NHẬN GẦN NHẤT' })).not.toHaveTextContent('Bạn chưa xác nhận lần nào')
  })

  it('confirm_WhileRequestRunning_ShowsProcessingAndDisablesButtons', async () => {
    server.use(
      http.post('*/api/owner/life-confirmation', async () => {
        await delay(100)
        return HttpResponse.json({ ownerId: 1, lastConfirmedAliveAt: new Date().toISOString() })
      }),
    )
    renderPage()
    await waitForPage()
    await userEvent.click(confirmButton())
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận điểm danh' }))
    expect(within(dialog).getByText('Đang đồng bộ điểm danh lên máy chủ...')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Đang xử lý dữ liệu...' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Hủy' })).toBeDisabled()
    expect(await screen.findByText('Điểm danh thành công!')).toBeInTheDocument()
  })

  it('confirm_Conflict409_ShowsReasonAndKeepsDialogOpen', async () => {
    getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status: 'Approved', initiatedAt: new Date().toISOString(), documents: [], cases: [] })
    saveDb()
    renderPage()
    await waitForPage()
    await userEvent.click(confirmButton())
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận điểm danh' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('đã được duyệt pháp lý')
  })

  it('confirm_NetworkFailure_ShowsConnectionErrorWithRetry', async () => {
    server.use(http.post('*/api/owner/life-confirmation', () => HttpResponse.error()))
    renderPage()
    await waitForPage()
    await userEvent.click(confirmButton())
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận điểm danh' }))
    expect(await within(dialog).findByText('Không thể kết nối đến máy chủ điểm danh')).toBeInTheDocument()
    server.resetHandlers()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thử kết nối lại ngay' }))
    expect(await screen.findByText('Điểm danh thành công!')).toBeInTheDocument()
  })

  it('confirm_PingQueryFlag_OpensDialogAutomatically', async () => {
    renderPage({}, '/owner/proof-of-life?ping=1')
    expect(await screen.findByRole('dialog', { name: 'Xác nhận điểm danh' })).toBeInTheDocument()
  })

  it('confirm_NewOwnerWithoutVault_StillWorks', async () => {
    await register({ fullName: 'Chủ Mới', email: 'moi@example.com', password: 'MatKhau@12345', confirmPassword: 'MatKhau@12345' })
    await login('moi@example.com', 'MatKhau@12345')
    renderPage()
    await waitForPage()
    expect(screen.getByRole('group', { name: 'LẦN XÁC NHẬN GẦN NHẤT' })).toHaveTextContent('Bạn chưa xác nhận lần nào')
  })
})
