import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { getDb, resetMockDb, ROLE_ACCOUNTS } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import LegalHandoverDetailPage from './LegalHandoverDetailPage'
import LegalHandoverListPage from './LegalHandoverListPage'

const server = setupServer(...handlers)
const VERIFIER = ROLE_ACCOUNTS.find((account) => account.role === 'LegalVerifier')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(VERIFIER.email, VERIFIER.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function seedHandover(status = 'Pending_Legal', overrides = {}) {
  const db = getDb()
  const requestId = (db.handovers?.length || 0) + 1
  const item = {
    requestId,
    vaultId: 1,
    requestType: 'Standard',
    status,
    initiatedAt: new Date().toISOString(),
    documents: [
      {
        documentId: 101,
        fileName: 'Giay_Chung_Tu.pdf',
        fileType: 'application/pdf',
        isEncrypted: true,
        signatureValid: true,
      },
    ],
    assetDocuments: [
      {
        documentId: 201,
        fileName: 'So_Do_Dat.pdf',
        fileType: 'application/pdf',
        isEncrypted: true,
      },
    ],
    cases: [
      {
        handoverId: 1,
        assetId: 1,
        beneficiaryId: 1,
        status: 'Pending',
      },
    ],
    ...overrides,
  }
  db.handovers = [...(db.handovers || []), item]
  return item
}

describe('LegalHandoverListPage', () => {
  it('renders title and empty message when no items', async () => {
    renderWithProviders(<LegalHandoverListPage status="Pending_Legal" emptyMessage="Không có hồ sơ nào" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Hồ sơ chờ thẩm định' })).toBeInTheDocument()
    expect(await screen.findByText('Không có hồ sơ nào')).toBeInTheDocument()
  })

  it('renders handovers and links to detail', async () => {
    seedHandover('Pending_Legal')
    renderWithProviders(
      <LegalHandoverListPage status="Pending_Legal" />,
      {
        extraRoutes: [{ path: '/verifier/handovers/:requestId', element: <p>detail-page</p> }],
      },
    )

    expect(await screen.findByText(/^HS-\d{4}-0001$/)).toBeInTheDocument()
    expect(screen.getByText('Kho #1')).toBeInTheDocument()

    const viewLink = screen.getByRole('link', { name: /Xem/i })
    expect(viewLink).toHaveAttribute('href', '/verifier/handovers/1')
  })
})

describe('LegalHandoverDetailPage', () => {
  const renderDetail = (requestId) =>
    renderWithProviders(<LegalHandoverDetailPage />, {
      route: `/verifier/handovers/${requestId}`,
      path: '/verifier/handovers/:requestId',
      extraRoutes: [{ path: '/verifier/pending', element: <p>pending-list</p> }],
    })

  it('shows not found when invalid id', async () => {
    renderDetail(999)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy hồ sơ bàn giao.')
  })

  it('renders detail info, documents and allows review when Pending_Legal', async () => {
    const item = seedHandover('Pending_Legal')
    renderDetail(item.requestId)

    expect(await screen.findByRole('heading', { level: 1, name: new RegExp(`^HS-\\d{4}-${String(item.requestId).padStart(4, "0")}( · |$)`) })).toBeInTheDocument()
    expect(screen.getByText('Giay_Chung_Tu.pdf')).toBeInTheDocument()
    expect(screen.getByText('So_Do_Dat.pdf')).toBeInTheDocument()

    // 3 action buttons should be enabled
    const approveBtn = screen.getByRole('button', { name: /Duyệt hồ sơ/i })
    const rejectBtn = screen.getByRole('button', { name: /Từ chối/i })
    const additionalBtn = screen.getByRole('button', { name: /Yêu cầu bổ sung thông tin/i })

    expect(approveBtn).not.toBeDisabled()
    expect(rejectBtn).not.toBeDisabled()
    expect(additionalBtn).not.toBeDisabled()
  })

  it('disables review action buttons when status is not Pending_Legal and not yet decided', async () => {
    const item = seedHandover('Draft')
    renderDetail(item.requestId)

    expect(await screen.findByRole('heading', { level: 1, name: new RegExp(`^HS-\\d{4}-${String(item.requestId).padStart(4, "0")}( · |$)`) })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Duyệt hồ sơ/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Từ chối/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Yêu cầu bổ sung thông tin/i })).toBeDisabled()
    expect(screen.getByText(/Chỉ những hồ sơ ở trạng thái/i)).toBeInTheDocument()
  })

  it('replaces the action buttons with the review outcome once the handover is decided', async () => {
    const item = seedHandover('Approved')
    renderDetail(item.requestId)

    expect(await screen.findByRole('heading', { level: 1, name: new RegExp(`^HS-\\d{4}-${String(item.requestId).padStart(4, "0")}( · |$)`) })).toBeInTheDocument()
    expect(screen.getByText('Kết quả thẩm định:')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Duyệt hồ sơ/i })).not.toBeInTheDocument()
  })

  it('opens review modal, validates comment length 1-2000 chars, and submits approve', async () => {
    const item = seedHandover('Pending_Legal')
    renderDetail(item.requestId)

    await screen.findByRole('heading', { level: 1, name: new RegExp(`^HS-\\d{4}-${String(item.requestId).padStart(4, "0")}( · |$)`) })
    const approveBtn = screen.getByRole('button', { name: /Duyệt hồ sơ/i })
    await userEvent.click(approveBtn)

    // Modal opens
    const modal = screen.getByRole('dialog')
    expect(within(modal).getByRole('heading', { name: 'Phê duyệt hồ sơ bàn giao' })).toBeInTheDocument()

    const submitBtn = within(modal).getByRole('button', { name: 'Xác nhận duyệt' })
    const textarea = within(modal).getByPlaceholderText(/Nhập nhận xét \/ căn cứ phê duyệt/i)

    // Try submit empty -> validation error
    await userEvent.click(submitBtn)
    expect(within(modal).getByText(/tối thiểu 1 ký tự/i)).toBeInTheDocument()

    // Fill valid comment
    await userEvent.type(textarea, 'Hồ sơ pháp lý đầy đủ và hợp lệ theo Nghị định 23.')
    await userEvent.click(submitBtn)

    // Hộp thoại nhập nhận xét đóng và hộp thoại kết quả hiện ra; bấm Đã hiểu thì đóng nốt
    const result = await screen.findByRole('heading', { name: 'Đã duyệt hồ sơ' })
    expect(screen.queryByRole('heading', { name: 'Phê duyệt hồ sơ bàn giao' })).not.toBeInTheDocument()
    expect(result).toBeInTheDocument()
    expect(screen.getByText('Trạng thái mới:')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
