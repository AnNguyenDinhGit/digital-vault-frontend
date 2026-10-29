import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import axiosClient from '../../callapi/axiosClient'
import { DEMO_ACCOUNT, getDb, nextId, resetMockDb, saveDb } from '../../mocks/db'
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

// Seed một phân bổ đang chờ xác nhận (BE hiện chỉ định xong là Active, nhưng FE vẫn xử lý Pending nếu BE trả về)
function seedPendingAssignment(assetId, email, allocation) {
  const db = getDb()
  const user = db.users.find((item) => item.email === email)
  db.assignments.push({ assignmentId: nextId('assignment'), assetId, beneficiaryId: user.userId, allocation, status: 'Pending' })
  saveDb()
}

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

  it('header_RevokedAsset_ShowsRevokedBadge', async () => {
    await axiosClient.post('/owner/assets/1/revoke')
    renderDetail(1)
    await waitForDetail()
    expect(screen.getByText('Đã thu hồi')).toBeInTheDocument()
  })

  it('header_EditButton_IsEnabled', async () => {
    renderDetail(1)
    await waitForDetail()
    expect(screen.getByRole('button', { name: 'Chỉnh sửa' })).toBeEnabled()
  })

  it('edit_ChangeName_UpdatesHeadingAndShowsToast', async () => {
    renderDetail(1)
    await waitForDetail()
    await userEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    const dialog = screen.getByRole('dialog', { name: 'Chỉnh Sửa Tài Sản' })
    const name = within(dialog).getByLabelText(/Tên tài sản/)
    await userEvent.clear(name)
    await userEvent.type(name, 'Ví Lạnh Mới')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ví Lạnh Mới'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Đã cập nhật tài sản')).toBeInTheDocument()
  })

  it('revoke_Confirm_ReturnsToCatalog', async () => {
    renderDetail(1)
    await waitForDetail()
    await userEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Thu hồi tài sản' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận thu hồi' }))
    expect(await screen.findByText('catalog-page')).toBeInTheDocument()
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

  describe('pending beneficiary', () => {
    const seedPending = () => seedPendingAssignment(4, 'long.tran@example.com', 50)

    it('pending_Row_ShowsWaitingBadgeAndExplanation', async () => {
      await seedPending()
      renderDetail(4)
      await waitForDetail()
      expect(screen.getByText('Chờ xác nhận')).toBeInTheDocument()
      expect(screen.getByText(/chưa được tính vào tỷ lệ phân bổ/)).toBeInTheDocument()
      expect(screen.getByText('1 người thụ hưởng')).toBeInTheDocument()
    })

    it('pending_Row_DoesNotCountInAllocationBar', async () => {
      await seedPending()
      renderDetail(4)
      await waitForDetail()
      expect(screen.getByRole('progressbar', { name: 'Tỷ lệ đã phân bổ' })).toHaveAttribute('aria-valuenow', '0')
      expect(screen.getByText('Đã phân bổ 0%')).toBeInTheDocument()
    })

  })

  it('beneficiaries_Row_ShowsInitialsAvatar', async () => {
    renderDetail(1)
    await waitForDetail()
    const table = screen.getByRole('table', { name: 'Danh sách người thụ hưởng' })
    expect(within(within(table).getByRole('row', { name: /Trần Bảo Long/ })).getByText('BL')).toBeInTheDocument()
  })

  it('documents_List_ShowsFileTypeLabelsAndEnabledDownload', async () => {
    renderDetail(3)
    await waitForDetail()
    const list = screen.getByRole('list', { name: 'Giấy tờ đính kèm' })
    expect(within(list).getByText('PDF')).toBeInTheDocument()
    expect(within(list).getByText('PNG')).toBeInTheDocument()
    const downloads = within(list).getAllByRole('button', { name: 'Tải về' })
    expect(downloads).toHaveLength(2)
    downloads.forEach((button) => expect(button).toBeEnabled())
  })

  describe('download', () => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    let clicked

    beforeEach(() => {
      clicked = []
      URL.createObjectURL = vi.fn(() => 'blob:doc')
      URL.revokeObjectURL = vi.fn()
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
        clicked.push(this.download)
      })
    })

    afterEach(() => {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      vi.restoreAllMocks()
    })

    it('download_Clicked_SavesFileWithItsNameAndShowsToast', async () => {
      renderDetail(2)
      await waitForDetail()
      await userEvent.click(within(screen.getByRole('list', { name: 'Giấy tờ đính kèm' })).getByRole('button', { name: 'Tải về' }))
      expect(await screen.findByText('Đã tải xuống SoTietKiem_Signed.pdf')).toBeInTheDocument()
      expect(clicked).toEqual(['SoTietKiem_Signed.pdf'])
    })

    it('download_OnlyThatDocumentIsRequested', async () => {
      renderDetail(3)
      await waitForDetail()
      const buttons = within(screen.getByRole('list', { name: 'Giấy tờ đính kèm' })).getAllByRole('button', { name: 'Tải về' })
      await userEvent.click(buttons[1])
      expect(await screen.findByText('Đã tải xuống AnhGiaDinh.png')).toBeInTheDocument()
      expect(clicked).toEqual(['AnhGiaDinh.png'])
    })

    it('download_ServerError_ShowsAlertAndDoesNotSaveFile', async () => {
      server.use(http.get('*/api/owner/assets/:assetId/documents/:documentId/content', () => HttpResponse.json({ status: 500, detail: 'Kho lưu trữ đang bảo trì.' }, { status: 500 })))
      renderDetail(2)
      await waitForDetail()
      await userEvent.click(within(screen.getByRole('list', { name: 'Giấy tờ đính kèm' })).getByRole('button', { name: 'Tải về' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được SoTietKiem_Signed.pdf')
      expect(clicked).toEqual([])
    })

    it('download_NotFound_ShowsNotFoundMessage', async () => {
      server.use(http.get('*/api/owner/assets/:assetId/documents/:documentId/content', () => HttpResponse.json({ status: 404, detail: 'x' }, { status: 404 })))
      renderDetail(2)
      await waitForDetail()
      await userEvent.click(within(screen.getByRole('list', { name: 'Giấy tờ đính kèm' })).getByRole('button', { name: 'Tải về' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy giấy tờ')
    })

    it('download_HybridMode_ShowsNoPlaceholderNoticeBecauseBackendIsReal', async () => {
      renderWithProviders(<AssetDetailPage mockMode="hybrid" />, {
        route: '/owner/assets/2',
        path: '/owner/assets/:assetId',
      })
      await waitForDetail()
      expect(screen.queryByRole('note')).not.toBeInTheDocument()
    })

    it('download_MockMode_ShowsPlaceholderNotice', async () => {
      renderWithProviders(<AssetDetailPage mockMode="full" />, {
        route: '/owner/assets/2',
        path: '/owner/assets/:assetId',
      })
      await waitForDetail()
      expect(screen.getByRole('note')).toHaveTextContent('Nội dung tải về là bản mô phỏng')
    })
  })

  it('executor_Section_ShowsExecutorOfTheVault', async () => {
    renderDetail(1)
    await waitForDetail()
    const section = screen.getByRole('region', { name: 'Digital Executor giám sát' })
    expect(await within(section).findByText('LS. Lê Hoàng Nam')).toBeInTheDocument()
    expect(within(section).getByText('Đang hiệu lực')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: /Quản lý người thi hành/ })).toHaveAttribute('href', '/owner/executor')
  })
})

describe('AssetDetailPage revoke document', () => {
  const openRevoke = async (fileName) => {
    renderDetail(3)
    await waitForDetail()
    await userEvent.click(screen.getByRole('button', { name: `Thu hồi ${fileName}` }))
    return screen.getByRole('dialog', { name: 'Thu Hồi Giấy Tờ' })
  }

  it('revokeDocument_Dialog_NamesTheFileAndWarns', async () => {
    const dialog = await openRevoke('ThuDiNguyen.pdf')
    expect(within(dialog).getByText(/ThuDiNguyen\.pdf/)).toBeInTheDocument()
    expect(within(dialog).getByText(/không thể khôi phục/)).toBeInTheDocument()
  })

  it('revokeDocument_Confirm_RemovesDocumentFromListAndShowsToast', async () => {
    const dialog = await openRevoke('ThuDiNguyen.pdf')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận thu hồi' }))
    expect(await screen.findByText('Đã thu hồi giấy tờ')).toBeInTheDocument()
    // Danh sách tải lại sau khi thu hồi nên phải đợi giấy tờ biến mất
    await waitFor(() => expect(screen.queryByText('ThuDiNguyen.pdf')).not.toBeInTheDocument())
    expect(screen.getByText('AnhGiaDinh.png')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('revokeDocument_VaultLockedByHandover_ShowsHandoverReasonAndKeepsDocument', async () => {
    getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status: 'Draft', initiatedAt: new Date().toISOString(), documents: [], cases: [] })
    saveDb()
    const dialog = await openRevoke('ThuDiNguyen.pdf')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận thu hồi' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('hồ sơ bàn giao')
    expect(screen.getByText('ThuDiNguyen.pdf')).toBeInTheDocument()
  })

  it('revokeDocument_Cancel_ClosesDialogAndKeepsDocument', async () => {
    const dialog = await openRevoke('ThuDiNguyen.pdf')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Quay lại' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('ThuDiNguyen.pdf')).toBeInTheDocument()
  })
})
