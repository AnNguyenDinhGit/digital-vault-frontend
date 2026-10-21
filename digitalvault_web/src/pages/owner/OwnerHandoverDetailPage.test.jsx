import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { createHandover } from '../../callapi/executorApi'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import OwnerHandoverDetailPage from './OwnerHandoverDetailPage'

const server = setupServer(...handlers)
const EXECUTOR = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = (requestId) =>
  renderWithProviders(<OwnerHandoverDetailPage mockMode="full" />, {
    route: `/owner/handovers/${requestId}`,
    path: '/owner/handovers/:requestId',
    extraRoutes: [{ path: '/owner/handovers', element: <p>handover-list-page</p> }],
  })
const waitForPage = () => screen.findByRole('heading', { level: 1, name: /^Hồ sơ #/ })

// Executor tạo hồ sơ cho kho 1 rồi đăng nhập lại là Owner
async function seedHandover({ status = 'Draft', documents = [] } = {}) {
  await login(EXECUTOR.email, EXECUTOR.password)
  const request = await createHandover(1)
  const stored = getDb().handovers.find((item) => item.requestId === request.requestId)
  stored.status = status
  stored.documents = documents
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
  return request.requestId
}

describe('OwnerHandoverDetailPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    const id = await seedHandover()
    renderPage(id)
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải hồ sơ bàn giao')
    await waitForPage()
  })

  it('render_UnknownRequest_ShowsNotFoundWithBackLink', async () => {
    renderPage(999)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy hồ sơ bàn giao')
    await userEvent.click(screen.getByRole('link', { name: /Quay lại danh sách/ }))
    expect(await screen.findByText('handover-list-page')).toBeInTheDocument()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    const id = await seedHandover()
    server.use(http.get('*/api/owner/handovers/:requestId', () => HttpResponse.json({ status: 500, detail: 'Máy chủ bận.' }, { status: 500 })))
    renderPage(id)
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })
})

describe('OwnerHandoverDetailPage content', () => {
  it('render_Draft_ShowsStatusVaultAndCases', async () => {
    const id = await seedHandover()
    renderPage(id)
    await waitForPage()
    expect(screen.getByRole('heading', { level: 1, name: `Hồ sơ #${id}` })).toBeInTheDocument()
    expect(screen.getByText('Bản nháp')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Tài sản trong hồ sơ' })
    // Kho demo có phân bổ Active cho nhiều tài sản; mỗi phân bổ là một dòng, tên lấy từ danh sách tài sản của Owner
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1)
    expect(within(table).getAllByText(/Trần Bảo Long/).length).toBeGreaterThan(0)
  })

  it('render_NoDocuments_ShowsEmptyDocumentMessage', async () => {
    const id = await seedHandover()
    renderPage(id)
    await waitForPage()
    expect(screen.getByText('Người thi hành chưa nộp giấy tờ nào.')).toBeInTheDocument()
  })

  it('render_WithDocuments_ListsFileNamesWithoutDownloadButtons', async () => {
    const id = await seedHandover({
      status: 'Pending_Legal',
      documents: [{ documentId: 31, fileName: 'giay-chung-tu.pdf', fileType: 'application/pdf', documentKind: 'DeathCertificate', isEncrypted: true, hasSignature: true }],
    })
    renderPage(id)
    await waitForPage()
    expect(screen.getByText('giay-chung-tu.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tải/ })).not.toBeInTheDocument()
  })

  it('render_AssetNamesUnavailable_FallsBackToAssetId', async () => {
    const id = await seedHandover()
    server.use(http.get('*/api/owner/assets', () => HttpResponse.json({ status: 500, detail: 'x' }, { status: 500 })))
    renderPage(id)
    await waitForPage()
    expect(screen.getAllByText(/^Tài sản #\d+$/).length).toBeGreaterThan(0)
  })
})

describe('OwnerHandoverDetailPage cancel', () => {
  it('cancel_NonCancellableStatus_DisablesButton', async () => {
    const id = await seedHandover({ status: 'Pending_Legal' })
    renderPage(id)
    await waitForPage()
    expect(screen.getByRole('button', { name: 'Hủy hồ sơ' })).toBeDisabled()
  })

  it('cancel_Draft_ConfirmsAndShowsCancelledStatus', async () => {
    const id = await seedHandover()
    renderPage(id)
    await waitForPage()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy hồ sơ' }))
    const dialog = screen.getByRole('dialog', { name: 'Hủy Hồ Sơ Bàn Giao' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy' }))
    expect(await screen.findByText(`Đã hủy hồ sơ #${id}`)).toBeInTheDocument()
    expect(await screen.findByText('Đã hủy', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hủy hồ sơ' })).toBeDisabled()
  })
})
