import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { DEMO_ACCOUNT, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import AssetDetailPage from './AssetDetailPage'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderDetail = (assetId) =>
  renderWithProviders(<AssetDetailPage />, {
    route: `/owner/assets/${assetId}`,
    path: '/owner/assets/:assetId',
    extraRoutes: [{ path: '/owner/assets', element: <p>catalog-page</p> }],
  })

const waitForDetail = () => screen.findByRole('heading', { level: 1 })

describe('AssetDetailPage content', () => {
  it('render_Loading_ShowsStatus', async () => {
    renderDetail(1)
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải chi tiết tài sản')
    await waitForDetail()
  })

  it('render_ExistingAsset_ShowsNameCodeAndDescription', async () => {
    renderDetail(1)
    expect(await waitForDetail()).toHaveTextContent('Ví Lạnh Trữ Crypto (BTC & ETH Portfolio - 3.4 BTC)')
    expect(screen.getByText('#AST-CRYPTO-01')).toBeInTheDocument()
    expect(screen.getByText(/Bao gồm Seed Phrase 24 ký tự/)).toBeInTheDocument()
  })

  it('render_UnknownAsset_ShowsNotFoundWithBackLink', async () => {
    renderDetail(999)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy tài sản.')
    expect(screen.getByRole('link', { name: /Quay lại danh mục/ })).toHaveAttribute('href', '/owner/assets')
  })

  it('render_Ready_BackLinkPointsToCatalog', async () => {
    renderDetail(1)
    await waitForDetail()
    expect(screen.getByRole('link', { name: /Quay lại danh mục/ })).toHaveAttribute('href', '/owner/assets')
  })

  it('beneficiaries_AssetWithTwo_ListsRowsAndFullAllocation', async () => {
    renderDetail(1)
    await waitForDetail()
    const table = screen.getByRole('table', { name: 'Danh sách người thụ hưởng' })
    expect(within(table).getByRole('row', { name: /Trần Bảo Long/ })).toHaveTextContent('40%')
    expect(within(table).getByRole('row', { name: /Nguyễn Thị Mai/ })).toHaveTextContent('60%')
    expect(screen.getByText('Đã phân bổ 100%')).toBeInTheDocument()
  })

  it('documents_AssetWithFiles_ListsFileNamesAsEncrypted', async () => {
    renderDetail(3)
    await waitForDetail()
    const list = screen.getByRole('list', { name: 'Giấy tờ đính kèm' })
    expect(within(list).getByText('ThuDiNguyen.pdf')).toBeInTheDocument()
    expect(within(list).getByText('AnhGiaDinh.png')).toBeInTheDocument()
    expect(within(list).getAllByText('Đã mã hóa')).toHaveLength(2)
  })

  it('documents_AssetWithoutFiles_ShowsEmptyMessage', async () => {
    renderDetail(4)
    await waitForDetail()
    expect(screen.getByText('Chưa có giấy tờ nào.')).toBeInTheDocument()
  })

  it('beneficiaries_AssetWithoutAny_ShowsEmptyMessage', async () => {
    renderDetail(4)
    await waitForDetail()
    expect(screen.getByText('Tài sản này chưa có người thụ hưởng.')).toBeInTheDocument()
  })
})

describe('AssetDetailPage assign beneficiary', () => {
  const fill = async (email, allocation) => {
    const form = screen.getByRole('form', { name: 'Chỉ định người thụ hưởng' })
    if (email) await userEvent.type(within(form).getByLabelText(/^Email người thụ hưởng/), email)
    if (allocation) await userEvent.type(within(form).getByLabelText(/^Tỷ lệ phân bổ/), allocation)
    await userEvent.click(within(form).getByRole('button', { name: 'Chỉ định' }))
    return form
  }

  it('assign_FullyAllocatedAsset_HidesFormAndShowsNotice', async () => {
    renderDetail(1)
    await waitForDetail()
    expect(screen.queryByRole('form', { name: 'Chỉ định người thụ hưởng' })).not.toBeInTheDocument()
    expect(screen.getByText('Tài sản đã phân bổ đủ 100%.')).toBeInTheDocument()
  })

  it('assign_EmptyForm_ShowsValidationErrors', async () => {
    renderDetail(4)
    await waitForDetail()
    const form = await fill('', '')
    expect(within(form).getByText('Vui lòng nhập email.')).toBeInTheDocument()
    expect(within(form).getByText('Vui lòng nhập tỷ lệ phân bổ.')).toBeInTheDocument()
  })

  it('assign_ValidInput_AddsRowAndUpdatesTotal', async () => {
    renderDetail(4)
    await waitForDetail()
    await fill('long.tran@example.com', '50')
    const table = await screen.findByRole('table', { name: 'Danh sách người thụ hưởng' })
    expect(within(table).getByRole('row', { name: /Trần Bảo Long/ })).toHaveTextContent('50%')
    expect(screen.getByText('Đã phân bổ 50%')).toBeInTheDocument()
  })

  it('assign_UnregisteredEmail_ShowsNotFoundError', async () => {
    renderDetail(4)
    await waitForDetail()
    const form = await fill('khong.co@example.com', '10')
    expect(await within(form).findByRole('alert')).toHaveTextContent('Không tìm thấy tài khoản đang hoạt động với email này.')
  })

  it('assign_SameBeneficiaryTwice_ShowsConflictError', async () => {
    renderDetail(4)
    await waitForDetail()
    await fill('long.tran@example.com', '30')
    await screen.findByRole('table', { name: 'Danh sách người thụ hưởng' })
    const form = await fill('long.tran@example.com', '10')
    expect(await within(form).findByRole('alert')).toHaveTextContent('đã được chỉ định')
  })

  it('assign_AllocationOverRemaining_ShowsRemainingError', async () => {
    renderDetail(4)
    await waitForDetail()
    await fill('long.tran@example.com', '70')
    await screen.findByRole('table', { name: 'Danh sách người thụ hưởng' })
    const form = await fill('mai.nguyen@example.com', '40')
    expect(within(form).getByText('Chỉ còn 30% có thể phân bổ.')).toBeInTheDocument()
  })
})

describe('AssetDetailPage group A details', () => {
  it('header_ActiveAsset_ShowsStatusBadgeAndSummaryCounts', async () => {
    renderDetail(3)
    await waitForDetail()
    expect(screen.getByText('Đang hoạt động')).toBeInTheDocument()
    expect(screen.getByText('2 giấy tờ')).toBeInTheDocument()
    expect(screen.getByText('2 người thụ hưởng')).toBeInTheDocument()
  })

  it('header_EditButton_IsDisabledComingSoon', async () => {
    renderDetail(1)
    await waitForDetail()
    expect(screen.getByRole('button', { name: 'Chỉnh sửa' })).toBeDisabled()
  })

  it('allocation_FullyAllocated_ShowsFullBarAndZeroRemaining', async () => {
    renderDetail(1)
    await waitForDetail()
    expect(screen.getByRole('progressbar', { name: 'Tỷ lệ đã phân bổ' })).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('Còn chưa phân bổ 0%')).toBeInTheDocument()
  })

  it('allocation_NoBeneficiary_ShowsEmptyBarAndFullRemaining', async () => {
    renderDetail(4)
    await waitForDetail()
    expect(screen.getByRole('progressbar', { name: 'Tỷ lệ đã phân bổ' })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('Còn chưa phân bổ 100%')).toBeInTheDocument()
  })

  it('allocation_AfterAssign_UpdatesBarAndRemaining', async () => {
    renderDetail(4)
    await waitForDetail()
    const form = screen.getByRole('form', { name: 'Chỉ định người thụ hưởng' })
    await userEvent.type(within(form).getByLabelText(/^Email người thụ hưởng/), 'long.tran@example.com')
    await userEvent.type(within(form).getByLabelText(/^Tỷ lệ phân bổ/), '50')
    await userEvent.click(within(form).getByRole('button', { name: 'Chỉ định' }))
    expect(await screen.findByText('Còn chưa phân bổ 50%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Tỷ lệ đã phân bổ' })).toHaveAttribute('aria-valuenow', '50')
  })

  it('beneficiaries_Row_ShowsInitialsAvatar', async () => {
    renderDetail(1)
    await waitForDetail()
    const table = screen.getByRole('table', { name: 'Danh sách người thụ hưởng' })
    expect(within(within(table).getByRole('row', { name: /Trần Bảo Long/ })).getByText('BL')).toBeInTheDocument()
  })

  it('documents_List_ShowsFileTypeLabelsAndDisabledDownload', async () => {
    renderDetail(3)
    await waitForDetail()
    const list = screen.getByRole('list', { name: 'Giấy tờ đính kèm' })
    expect(within(list).getByText('PDF')).toBeInTheDocument()
    expect(within(list).getByText('PNG')).toBeInTheDocument()
    const downloads = within(list).getAllByRole('button', { name: 'Tải về' })
    expect(downloads).toHaveLength(2)
    downloads.forEach((button) => expect(button).toBeDisabled())
  })

  it('executor_Section_ShowsComingSoonPlaceholder', async () => {
    renderDetail(1)
    await waitForDetail()
    const section = screen.getByRole('region', { name: 'Digital Executor giám sát' })
    expect(within(section).getByText('Sắp ra mắt')).toBeInTheDocument()
  })
})
