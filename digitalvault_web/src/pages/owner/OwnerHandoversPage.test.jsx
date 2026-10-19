import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { createHandover } from '../../callapi/executorApi'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import OwnerHandoversPage from './OwnerHandoversPage'

const server = setupServer(...handlers)
const EXECUTOR = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = (props = {}) => renderWithProviders(<OwnerHandoversPage mockMode="full" {...props} />)
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Hồ sơ bàn giao' })

// Executor tạo hồ sơ cho kho 1 rồi đăng nhập lại là Owner
async function seedHandover(status = 'Draft') {
  await login(EXECUTOR.email, EXECUTOR.password)
  const request = await createHandover(1)
  getDb().handovers[0].status = status
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
  return request.requestId
}

describe('OwnerHandoversPage loading and empty state', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải hồ sơ bàn giao')
    await waitForPage()
  })

  it('render_NoHandover_ShowsEmptyMessageAndLockExplanation', async () => {
    renderPage()
    await waitForPage()
    expect(screen.getByText('Kho của bạn chưa có hồ sơ bàn giao nào.')).toBeInTheDocument()
    expect(screen.getByText(/đang có hồ sơ bàn giao/i)).toBeInTheDocument()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/owner/handovers', () => HttpResponse.json({ status: 500, detail: 'Máy chủ bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })

  it('render_FullMock_ShowsMockNoticeButHybridDoesNot', async () => {
    renderPage({ mockMode: 'full' })
    await waitForPage()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })

  it('render_Hybrid_HasNoMockNotice', async () => {
    renderPage({ mockMode: 'hybrid' })
    await waitForPage()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('OwnerHandoversPage list', () => {
  it('table_Handover_ShowsIdVaultStatusAndScope', async () => {
    const id = await seedHandover('Draft')
    renderPage()
    const table = await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    const row = within(table).getByRole('row', { name: new RegExp(`Hồ sơ #${id}`) })
    expect(row).toHaveTextContent('Kho #1')
    expect(row).toHaveTextContent('Bản nháp')
    expect(row).toHaveTextContent('4 tài sản')
  })

  it.each([['Draft'], ['Rejected']])('cancelButton_%sHandover_IsEnabled', async (status) => {
    await seedHandover(status)
    renderPage()
    const table = await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    expect(within(table).getByRole('button', { name: 'Hủy hồ sơ' })).toBeEnabled()
  })

  it.each([['Pending_Legal'], ['Approved'], ['In_Progress'], ['Completed'], ['Cancelled']])('cancelButton_%sHandover_IsDisabled', async (status) => {
    await seedHandover(status)
    renderPage()
    const table = await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    expect(within(table).getByRole('button', { name: 'Hủy hồ sơ' })).toBeDisabled()
  })
})

describe('OwnerHandoversPage cancel flow', () => {
  async function openConfirm() {
    const id = await seedHandover('Draft')
    renderPage()
    const table = await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    await userEvent.click(within(table).getByRole('button', { name: 'Hủy hồ sơ' }))
    return { id, dialog: screen.getByRole('dialog', { name: 'Hủy Hồ Sơ Bàn Giao' }) }
  }

  it('confirm_Opened_ExplainsConsequence', async () => {
    const { id, dialog } = await openConfirm()
    expect(dialog).toHaveTextContent(`Hồ sơ #${id}`)
    expect(dialog).toHaveTextContent('chỉnh sửa tài sản')
  })

  it('confirm_Accepted_CancelsHandoverAndShowsToast', async () => {
    const { id, dialog } = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy' }))
    expect(await screen.findByText(`Đã hủy hồ sơ #${id}`)).toBeInTheDocument()
    expect(getDb().handovers[0].status).toBe('Cancelled')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })).getByText('Đã hủy')).toBeInTheDocument()
  })

  it('confirm_Back_ClosesWithoutCancelling', async () => {
    const { dialog } = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Quay lại' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getDb().handovers[0].status).toBe('Draft')
  })

  it('confirm_ServerConflict_ShowsReasonInsideDialog', async () => {
    server.use(http.post('*/api/owner/handovers/:requestId/cancel', () => HttpResponse.json({ status: 409, detail: 'x' }, { status: 409 })))
    const { dialog } = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Chỉ hủy được hồ sơ ở trạng thái nháp hoặc bị từ chối.')
  })

  it('confirm_ServerError_ShowsServerMessage', async () => {
    server.use(http.post('*/api/owner/handovers/:requestId/cancel', () => HttpResponse.json({ status: 500, detail: 'Không hủy được.' }, { status: 500 })))
    const { dialog } = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không hủy được.')
  })
})
