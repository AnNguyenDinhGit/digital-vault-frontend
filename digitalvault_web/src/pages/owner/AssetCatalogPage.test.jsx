import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login, register } from '../../callapi/authApi'
import { createVault } from '../../callapi/ownerApi'
import { handlers } from '../../mocks/handlers'
import { DEMO_ACCOUNT, resetMockDb } from '../../mocks/db'
import { renderWithProviders } from '../../test/renderWithProviders'
import AssetCatalogPage from './AssetCatalogPage'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<AssetCatalogPage />)
const waitForCatalog = () => screen.findByRole('heading', { level: 1 })

describe('AssetCatalogPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải danh mục tài sản')
    await waitForCatalog()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/owner/vaults', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')

    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForCatalog()).toBeInTheDocument()
  })
})

describe('AssetCatalogPage banner and stats', () => {
  it('render_Ready_ShowsVaultBannerWithDisabledCheckIn', async () => {
    renderPage()
    expect(await waitForCatalog()).toHaveTextContent('Kho Tài Sản Số & Phân Quyền Thừa Kế Cá Nhân')
    expect(screen.getByText('VAULT #1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Điểm danh ngay/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Thêm tài sản mới/ })).toBeEnabled()
  })

  it('render_Ready_ShowsStatsFromRealData', async () => {
    renderPage()
    await waitForCatalog()
    expect(within(screen.getByRole('group', { name: 'TỔNG TÀI SẢN SỐ' })).getByText('06')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'NGƯỜI THỤ HƯỞNG' })).getByText('02')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'GIẤY TỜ ĐÍNH KÈM' })).toHaveTextContent('03/06')
    expect(screen.getByRole('group', { name: 'DIGITAL EXECUTOR' })).toHaveTextContent('Sắp ra mắt')
  })

  it('render_SingleVault_HidesVaultSelector', async () => {
    renderPage()
    await waitForCatalog()
    expect(screen.queryByRole('combobox', { name: 'Chọn kho' })).not.toBeInTheDocument()
  })

  it('render_TwoVaults_ShowsSelectorAndSwitchesBanner', async () => {
    await createVault({ name: 'Kho thứ hai', description: '' })
    renderPage()
    await waitForCatalog()
    const selector = screen.getByRole('combobox', { name: 'Chọn kho' })
    await userEvent.selectOptions(selector, 'Kho thứ hai')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kho thứ hai')
  })
})

describe('AssetCatalogPage asset list', () => {
  it('render_Ready_ShowsFirstFourAssetsWithSummary', async () => {
    renderPage()
    await waitForCatalog()
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('heading', { name: /Ví Lạnh Trữ Crypto/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Ví Phần Cứng Ledger/ })).not.toBeInTheDocument()
    expect(screen.getByText('Hiển thị 1 - 4 trong tổng số 6 tài sản số')).toBeInTheDocument()
  })

  it('card_WithBeneficiaries_ShowsNamesAndAllocation', async () => {
    renderPage()
    await waitForCatalog()
    const card = screen.getByRole('article', { name: /Ví Lạnh Trữ Crypto/ })
    expect(card).toHaveTextContent('Trần Bảo Long (40%)')
    expect(card).toHaveTextContent('Nguyễn Thị Mai (60%)')
  })

  it('card_NoBeneficiaryAndNoDocument_ShowsWarnings', async () => {
    renderPage()
    await waitForCatalog()
    const card = screen.getByRole('article', { name: /Kênh YouTube/ })
    expect(card).toHaveTextContent('Chưa phân quyền')
    expect(card).toHaveTextContent('Chưa có giấy tờ')
  })

  it('card_WithDocument_ShowsFileName', async () => {
    renderPage()
    await waitForCatalog()
    expect(screen.getByRole('article', { name: /Vietcombank/ })).toHaveTextContent('SoTietKiem_Signed.pdf')
  })

  it('card_Actions_DetailLinksAndEditDisabled', async () => {
    renderPage()
    await waitForCatalog()
    const card = screen.getByRole('article', { name: /Ví Lạnh Trữ Crypto/ })
    expect(within(card).getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute('href', '/owner/assets/1')
    expect(within(card).getByRole('button', { name: 'Chỉnh sửa' })).toBeDisabled()
  })

  it('pagination_NextPage_ShowsRemainingAssets', async () => {
    renderPage()
    await waitForCatalog()
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: /Ví Phần Cứng Ledger/ })).toBeInTheDocument()
    expect(screen.getByText('Hiển thị 5 - 6 trong tổng số 6 tài sản số')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tiếp' })).toBeDisabled()
  })

  it('pagination_ChangePageSize_ShowsMoreAssetsPerPage', async () => {
    renderPage()
    await waitForCatalog()
    await userEvent.selectOptions(screen.getByLabelText('Số lượng'), '8')
    expect(screen.getAllByRole('article')).toHaveLength(6)
  })

  it('search_Query_FiltersByNameIgnoringDiacritics', async () => {
    renderPage()
    await waitForCatalog()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm kiếm tài sản' }), 'ledger')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: /Ledger/ })).toBeInTheDocument()
  })

  it('search_NoMatch_ShowsEmptyMessage', async () => {
    renderPage()
    await waitForCatalog()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Tìm kiếm tài sản' }), 'zzzz')
    expect(screen.getByText('Không tìm thấy tài sản phù hợp.')).toBeInTheDocument()
  })

  it('tabs_SelectType_FiltersAssets', async () => {
    renderPage()
    await waitForCatalog()
    expect(screen.getByRole('button', { name: 'Tất cả (6)' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Ngân hàng (2)' }))
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })
})

describe('AssetCatalogPage add asset', () => {
  const openModal = () => userEvent.click(screen.getByRole('button', { name: /Thêm tài sản mới/ }))

  it('addAsset_EmptyForm_ShowsValidationErrors', async () => {
    renderPage()
    await waitForCatalog()
    await openModal()
    const dialog = screen.getByRole('dialog', { name: 'Thêm Tài Sản Số Mới' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu tài sản' }))
    expect(within(dialog).getByText('Vui lòng nhập tên tài sản.')).toBeInTheDocument()
  })

  it('addAsset_ValidForm_ClosesModalAndAddsAssetToList', async () => {
    renderPage()
    await waitForCatalog()
    await openModal()
    const dialog = screen.getByRole('dialog', { name: 'Thêm Tài Sản Số Mới' })
    expect(dialog).toHaveTextContent('Kho Tài Sản Số & Phân Quyền Thừa Kế Cá Nhân')
    await userEvent.type(within(dialog).getByLabelText(/^Tên tài sản/), 'Tài khoản Techcombank')
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Loại tài sản/), 'BankAccount')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu tài sản' }))

    expect(await screen.findByText('Hiển thị 1 - 4 trong tổng số 7 tài sản số')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('addAsset_ServerRejects_ShowsErrorInsideModal', async () => {
    server.use(
      http.post('*/api/owner/assets', () => HttpResponse.json({ status: 409, detail: 'Vault is not active.' }, { status: 409 })),
    )
    renderPage()
    await waitForCatalog()
    await openModal()
    const dialog = screen.getByRole('dialog', { name: 'Thêm Tài Sản Số Mới' })
    await userEvent.type(within(dialog).getByLabelText(/^Tên tài sản/), 'Tài sản')
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Loại tài sản/), 'Other')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu tài sản' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Kho này đang không hoạt động')
  })

  it('addAsset_Cancel_ClosesModal', async () => {
    renderPage()
    await waitForCatalog()
    await openModal()
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('AssetCatalogPage without vault', () => {
  async function loginAsNewOwner() {
    await register({ fullName: 'Chủ Mới', email: 'moi@example.com', phone: '', password: 'Registration123!', confirmPassword: 'Registration123!' })
    await login('moi@example.com', 'Registration123!')
  }

  it('render_NoVault_ShowsCreateVaultPrompt', async () => {
    await loginAsNewOwner()
    renderPage()
    expect(await screen.findByText('Bạn chưa có kho lưu trữ nào.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo kho đầu tiên' })).toBeInTheDocument()
  })

  it('createVault_ValidName_ShowsNewVaultBanner', async () => {
    await loginAsNewOwner()
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo kho đầu tiên' }))
    const dialog = screen.getByRole('dialog', { name: 'Tạo Kho Lưu Trữ Mới' })
    await userEvent.type(within(dialog).getByLabelText(/^Tên kho/), 'Kho của tôi')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo kho' }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Kho của tôi')
    expect(screen.getByText('Kho này chưa có tài sản nào.')).toBeInTheDocument()
  })

  it('createVault_EmptyName_ShowsValidationError', async () => {
    await loginAsNewOwner()
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo kho đầu tiên' }))
    const dialog = screen.getByRole('dialog', { name: 'Tạo Kho Lưu Trữ Mới' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo kho' }))
    expect(within(dialog).getByText('Vui lòng nhập tên kho.')).toBeInTheDocument()
  })
})
