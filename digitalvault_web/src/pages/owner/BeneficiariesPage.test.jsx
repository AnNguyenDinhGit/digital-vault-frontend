import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login, register } from '../../callapi/authApi'
import { DEMO_ACCOUNT, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import BeneficiariesPage from './BeneficiariesPage'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<BeneficiariesPage />)
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Người thụ hưởng' })

describe('BeneficiariesPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải danh sách người thụ hưởng')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/owner/vaults', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })
})

describe('BeneficiariesPage list', () => {
  it('render_Ready_ShowsOneCardPerPersonSortedByName', async () => {
    renderPage()
    await waitForPage()
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]).getByRole('heading', { name: 'Nguyễn Thị Mai' })).toBeInTheDocument()
    expect(within(cards[1]).getByRole('heading', { name: 'Trần Bảo Long' })).toBeInTheDocument()
  })

  it('card_Person_ListsAssetsWithAllocationAsLinks', async () => {
    renderPage()
    await waitForPage()
    const card = screen.getByRole('article', { name: 'Trần Bảo Long' })
    const link = within(card).getByRole('link', { name: /Ví Lạnh Trữ Crypto/ })
    expect(link).toHaveAttribute('href', '/owner/assets/1')
    expect(link).toHaveTextContent('40%')
    expect(card).toHaveTextContent('3 tài sản')
  })

  it('card_Actions_EditAndDeleteAreDisabled', async () => {
    renderPage()
    await waitForPage()
    const card = screen.getByRole('article', { name: 'Trần Bảo Long' })
    expect(within(card).getByRole('button', { name: 'Sửa phân quyền' })).toBeDisabled()
    expect(within(card).getByRole('button', { name: 'Xóa' })).toBeDisabled()
  })

  it('stats_Ready_CountsPeopleAndAllocatedAssets', async () => {
    renderPage()
    await waitForPage()
    expect(within(screen.getByRole('group', { name: 'NGƯỜI THỤ HƯỞNG' })).getByText('02')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'TÀI SẢN ĐÃ PHÂN BỔ' })).toHaveTextContent('04/06')
  })

  it('search_ByNameIgnoringDiacritics_FiltersCards', async () => {
    renderPage()
    await waitForPage()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm người thụ hưởng' }), 'bao long')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Trần Bảo Long' })).toBeInTheDocument()
  })

  it('search_NoMatch_ShowsEmptyMessage', async () => {
    renderPage()
    await waitForPage()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm người thụ hưởng' }), 'zzzz')
    expect(screen.getByText('Không tìm thấy người thụ hưởng phù hợp.')).toBeInTheDocument()
  })
})

describe('BeneficiariesPage without data', () => {
  it('render_NewOwnerWithoutAssets_ShowsEmptyStateAndDisabledAdd', async () => {
    await register({ fullName: 'Chủ Mới', email: 'moi@example.com', phone: '', password: 'Registration123!', confirmPassword: 'Registration123!' })
    await login('moi@example.com', 'Registration123!')
    renderPage()
    expect(await screen.findByText('Bạn chưa có người thụ hưởng nào.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm người thụ hưởng' })).toBeDisabled()
  })
})

describe('BeneficiariesPage add beneficiary', () => {
  const openModal = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Thêm người thụ hưởng' }))
    return screen.getByRole('dialog', { name: 'Thêm Người Thụ Hưởng' })
  }

  it('addModal_AssetSelect_OnlyListsAssetsWithRemainingAllocation', async () => {
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    const options = within(within(dialog).getByLabelText(/^Tài sản/)).getAllByRole('option').map((o) => o.textContent)
    expect(options).toHaveLength(3)
    expect(options[1]).toMatch(/Kênh YouTube/)
    expect(options[2]).toMatch(/Ledger/)
  })

  it('addModal_EmptyForm_ShowsValidationErrors', async () => {
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chỉ định' }))
    expect(within(dialog).getByText('Vui lòng chọn tài sản.')).toBeInTheDocument()
    expect(within(dialog).getByText('Vui lòng nhập email.')).toBeInTheDocument()
    expect(within(dialog).getByText('Vui lòng nhập tỷ lệ phân bổ.')).toBeInTheDocument()
  })

  it('addModal_ValidForm_ClosesAndShowsNewPerson', async () => {
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Tài sản/), '4')
    await userEvent.type(within(dialog).getByLabelText(/^Email người thụ hưởng/), 'quan.le@example.com')
    await userEvent.type(within(dialog).getByLabelText(/^Tỷ lệ phân bổ/), '100')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chỉ định' }))

    expect(await screen.findByRole('article', { name: 'Lê Minh Quân' })).toHaveTextContent('100%')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('addModal_UnregisteredEmail_ShowsServerErrorInsideDialog', async () => {
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Tài sản/), '4')
    await userEvent.type(within(dialog).getByLabelText(/^Email người thụ hưởng/), 'khong.co@example.com')
    await userEvent.type(within(dialog).getByLabelText(/^Tỷ lệ phân bổ/), '10')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chỉ định' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không tìm thấy tài khoản đang hoạt động với email này.')
  })

  it('addModal_AllocationOverRemaining_ShowsRemainingError', async () => {
    renderPage()
    await waitForPage()
    let dialog = await openModal()
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Tài sản/), '6')
    await userEvent.type(within(dialog).getByLabelText(/^Email người thụ hưởng/), 'long.tran@example.com')
    await userEvent.type(within(dialog).getByLabelText(/^Tỷ lệ phân bổ/), '70')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chỉ định' }))
    // Đợi modal đóng và danh sách tải lại xong rồi mới mở modal lần hai
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitForPage()

    dialog = await openModal()
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Tài sản/), '6')
    await userEvent.type(within(dialog).getByLabelText(/^Email người thụ hưởng/), 'mai.nguyen@example.com')
    await userEvent.type(within(dialog).getByLabelText(/^Tỷ lệ phân bổ/), '40')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Chỉ định' }))
    expect(within(dialog).getByText('Chỉ còn 30% có thể phân bổ.')).toBeInTheDocument()
  })

  it('addModal_Cancel_ClosesDialog', async () => {
    renderPage()
    await waitForPage()
    await openModal()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
