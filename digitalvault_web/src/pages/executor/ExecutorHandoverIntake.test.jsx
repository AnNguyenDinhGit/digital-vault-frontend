import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { ROLE_ACCOUNTS, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { createPendingRequest } from '../../test/pendingRequest'
import { renderWithProviders } from '../../test/renderWithProviders'
import ExecutorHandoverDetailPage from './ExecutorHandoverDetailPage'

const server = setupServer(...handlers)
const EXECUTOR = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(EXECUTOR.email, EXECUTOR.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderDetail = (requestId) =>
  renderWithProviders(<ExecutorHandoverDetailPage mockMode="full" />, {
    route: `/executor/handovers/${requestId}`,
    path: '/executor/handovers/:requestId',
    extraRoutes: [{ path: '/executor/orders', element: <p>orders-page</p> }],
  })
const waitForDetail = () => screen.findByRole('heading', { level: 1, name: /^Hồ sơ #/ })
const panel = () => screen.queryByRole('region', { name: 'Quyết định tiếp nhận' })

// Hồ sơ do Owner tạo (Pending_Executor) rồi đưa về trạng thái cần thử; trả về mã hồ sơ
let lastVaultId = 0
async function createWithStatus(status) {
  const created = await createPendingRequest(status)
  lastVaultId = created.vaultId
  return created.requestId
}
const handoverOf = (id) => getDb().handovers.find((item) => item.requestId === id)

describe('intake decision panel visibility', () => {
  it('panel_PendingExecutor_ShowsAcceptAndDeclineAndHidesUploadForms', async () => {
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    expect(within(panel()).getByRole('button', { name: 'Chấp nhận' })).toBeEnabled()
    expect(within(panel()).getByRole('button', { name: 'Từ chối tiếp nhận' })).toBeEnabled()
    expect(screen.getByText('Chờ Executor tiếp nhận')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Gửi thẩm định pháp lý' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Nộp giấy chứng tử' })).not.toBeInTheDocument()
  })

  it.each(['Draft', 'Pending_Legal', 'Approved', 'Declined', 'Cancelled'])('panel_%s_IsHidden', async (status) => {
    const id = await createWithStatus(status)
    renderDetail(id)
    await waitForDetail()
    expect(panel()).not.toBeInTheDocument()
  })

  it('declinedNote_Declined_ExplainsRequestIsClosed', async () => {
    const id = await createWithStatus('Declined')
    renderDetail(id)
    await waitForDetail()
    expect(screen.getByText('Bạn đã từ chối tiếp nhận hồ sơ này. Hồ sơ chỉ còn để xem lại.')).toBeInTheDocument()
  })
})

describe('accept flow', () => {
  it('accept_Click_MovesToDraftShowsToastAndUploadForms', async () => {
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    await userEvent.click(within(panel()).getByRole('button', { name: 'Chấp nhận' }))
    expect(await screen.findByText('Đã tiếp nhận hồ sơ')).toBeInTheDocument()
    await waitFor(() => expect(panel()).not.toBeInTheDocument())
    expect(await screen.findByText('Bản nháp')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Gửi thẩm định pháp lý' })).toBeInTheDocument()
  })

  it('accept_RequestAlreadyCancelled409_ExplainsAndReloads', async () => {
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    handoverOf(id).status = 'Cancelled'
    await userEvent.click(within(panel()).getByRole('button', { name: 'Chấp nhận' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('không còn ở trạng thái chờ tiếp nhận')
    expect(await screen.findByText('Đã hủy')).toBeInTheDocument()
  })

  it('accept_VaultNotReady409_ShowsServerReason', async () => {
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    getDb().assets.filter((asset) => asset.vaultId === lastVaultId).forEach((asset) => (asset.documents = []))
    await userEvent.click(within(panel()).getByRole('button', { name: 'Chấp nhận' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa đủ điều kiện')
  })

  it('accept_ServerError_ShowsMessageAndKeepsPanel', async () => {
    server.use(http.post('*/api/executor/handovers/:requestId/accept', () => HttpResponse.json({ status: 500, detail: 'Máy chủ lỗi.' }, { status: 500 })))
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    await userEvent.click(within(panel()).getByRole('button', { name: 'Chấp nhận' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ lỗi.')
    expect(panel()).toBeInTheDocument()
  })
})

describe('decline flow', () => {
  const openDialog = async () => {
    await userEvent.click(within(panel()).getByRole('button', { name: 'Từ chối tiếp nhận' }))
    return screen.getByRole('dialog', { name: 'Từ Chối Tiếp Nhận Hồ Sơ' })
  }

  it('decline_EmptyReason_ShowsValidationErrorAndDoesNotCallApi', async () => {
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    const dialog = await openDialog()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận từ chối' }))
    expect(within(dialog).getByText('Vui lòng nhập lý do từ chối.')).toBeInTheDocument()
    expect(handoverOf(id).status).toBe('Pending_Executor')
  })

  it('decline_ReasonTooLong_ShowsValidationError', async () => {
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    const dialog = await openDialog()
    const input = within(dialog).getByLabelText(/^Lý do từ chối/)
    await userEvent.click(input)
    await userEvent.paste('x'.repeat(2001))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận từ chối' }))
    expect(within(dialog).getByText('Lý do tối đa 2000 ký tự.')).toBeInTheDocument()
  })

  it('decline_ValidReason_DeclinesShowsToastAndClosedNote', async () => {
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    const dialog = await openDialog()
    await userEvent.type(within(dialog).getByLabelText(/^Lý do từ chối/), 'Tôi đang bận công tác')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận từ chối' }))
    expect(await screen.findByText('Đã từ chối hồ sơ')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Executor từ chối')).toBeInTheDocument()
    expect(handoverOf(id).status).toBe('Declined')
  })

  it('decline_ServerError_ShowsMessageInsideDialogAndKeepsItOpen', async () => {
    server.use(http.post('*/api/executor/handovers/:requestId/decline', () => HttpResponse.json({ status: 500, detail: 'Máy chủ lỗi.' }, { status: 500 })))
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    const dialog = await openDialog()
    await userEvent.type(within(dialog).getByLabelText(/^Lý do từ chối/), 'Bận')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận từ chối' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Máy chủ lỗi.')
  })

  it('decline_Cancel_ClosesDialogWithoutDeclining', async () => {
    const id = await createWithStatus('Pending_Executor')
    renderDetail(id)
    await waitForDetail()
    const dialog = await openDialog()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Quay lại' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(handoverOf(id).status).toBe('Pending_Executor')
  })
})
