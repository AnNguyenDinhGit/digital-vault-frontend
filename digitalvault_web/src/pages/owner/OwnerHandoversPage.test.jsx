import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { createHandover } from '../../callapi/executorApi'
import axiosClient from '../../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, resetMockDb, saveDb } from '../../mocks/db'
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
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Chỉ hủy được hồ sơ đang chờ Executor tiếp nhận, bản nháp hoặc bị từ chối.')
  })

  it('confirm_ServerError_ShowsServerMessage', async () => {
    server.use(http.post('*/api/owner/handovers/:requestId/cancel', () => HttpResponse.json({ status: 500, detail: 'Không hủy được.' }, { status: 500 })))
    const { dialog } = await openConfirm()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không hủy được.')
  })
})

// Dựng kho sẵn sàng bàn giao: có giấy tờ và đủ 100% phân bổ Active
async function seedReadyVault() {
  const { data: vault } = await axiosClient.post('/owner/vaults', { name: 'Kho sẵn sàng', description: null })
  const { data: asset } = await axiosClient.post('/owner/assets', { vaultId: vault.vaultId, name: 'Tài sản A', type: 'Other' })
  getDb().assets.find((item) => item.assetId === asset.assetId).documents.push({ documentId: 901, fileName: 'a.pdf', fileType: 'application/pdf', isEncrypted: true, signatureValid: null })
  saveDb()
  await axiosClient.post(`/owner/assets/${asset.assetId}/beneficiaries`, { email: 'long.tran@example.com', allocation: 100 })
  return vault
}

describe('OwnerHandoversPage create flow', () => {
  const openModal = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ bàn giao' }))
    return screen.getByRole('dialog', { name: 'Tạo Hồ Sơ Bàn Giao' })
  }

  it('create_ReadyVault_CreatesDraftAndShowsItInList', async () => {
    const vault = await seedReadyVault()
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await userEvent.selectOptions(await within(dialog).findByLabelText('Kho cần bàn giao'), String(vault.vaultId))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo hồ sơ' }))
    expect(await screen.findByText(/Đã tạo hồ sơ #/)).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    expect(within(table).getByText('Chờ Executor tiếp nhận')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('create_VaultNotReady_ShowsReasonAndKeepsDialogOpen', async () => {
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await within(dialog).findByLabelText('Kho cần bàn giao')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo hồ sơ' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('giấy tờ')
    expect(screen.getByRole('dialog', { name: 'Tạo Hồ Sơ Bàn Giao' })).toBeInTheDocument()
  })

  it('create_NoActiveVault_DisablesSubmitAndShowsEmptyMessage', async () => {
    getDb().vaults.forEach((vault) => (vault.status = 'Closed'))
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    expect(await within(dialog).findByText('Bạn chưa có kho nào đang hoạt động.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Tạo hồ sơ' })).toBeDisabled()
  })

  it('create_VaultListFails_ShowsErrorInDialog', async () => {
    server.use(http.get('*/api/owner/vaults', () => HttpResponse.json({ status: 500, detail: 'x' }, { status: 500 })))
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không tải được danh sách kho')
  })

  it('create_Cancel_ClosesDialog', async () => {
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('OwnerHandoversPage detail link', () => {
  it('row_RequestId_LinksToDetailPage', async () => {
    const id = await seedHandover()
    renderPage()
    await waitForPage()
    expect(screen.getByRole('link', { name: `Hồ sơ #${id}` })).toHaveAttribute('href', `/owner/handovers/${id}`)
  })
})

describe('OwnerHandoversPage new statuses', () => {
  it('row_PendingExecutor_ShowsLabelAndAllowsCancel', async () => {
    await seedHandover('Pending_Executor')
    renderPage()
    await waitForPage()
    const table = screen.getByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    expect(within(table).getByText('Chờ Executor tiếp nhận')).toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'Hủy hồ sơ' })).toBeEnabled()
  })

  it('row_Declined_ShowsLabelAndCannotBeCancelled', async () => {
    await seedHandover('Declined')
    renderPage()
    await waitForPage()
    const table = screen.getByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    expect(within(table).getByText('Executor từ chối')).toBeInTheDocument()
    expect(within(table).getByRole('button', { name: 'Hủy hồ sơ' })).toBeDisabled()
  })
})

describe('OwnerHandoversPage choose Executor when creating', () => {
  const openModal = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ bàn giao' }))
    return screen.getByRole('dialog', { name: 'Tạo Hồ Sơ Bàn Giao' })
  }
  const submit = (dialog) => userEvent.click(within(dialog).getByRole('button', { name: 'Tạo hồ sơ' }))

  it('executorSelect_Default_OffersSystemChoiceAndListedExecutors', async () => {
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    const select = await within(dialog).findByLabelText('Người thi hành')
    await within(select).findByRole('option', { name: /Lê Hoàng Nam/ })
    expect(within(select).getByRole('option', { name: 'Để hệ thống tự chọn' })).toHaveValue('')
    expect(within(select).getAllByRole('option')).toHaveLength(4)
  })

  it('executorSelect_Chosen_AssignsThenCreatesHandoverForThatExecutor', async () => {
    const vault = await seedReadyVault()
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await userEvent.selectOptions(await within(dialog).findByLabelText('Kho cần bàn giao'), String(vault.vaultId))
    const select = await within(dialog).findByLabelText('Người thi hành')
    await within(select).findByRole('option', { name: /Trần Đăng Khoa/ })
    await userEvent.selectOptions(select, '21')
    await submit(dialog)
    expect(await screen.findByText(/Đã tạo hồ sơ #/)).toBeInTheDocument()
    expect(getDb().executorAssignments[vault.vaultId].executorId).toBe(21)
    expect(getDb().handovers.find((item) => item.vaultId === vault.vaultId).executorId).toBe(21)
  })

  it('executorSelect_SystemChoice_LeavesAssignmentToBackend', async () => {
    const vault = await seedReadyVault()
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await userEvent.selectOptions(await within(dialog).findByLabelText('Kho cần bàn giao'), String(vault.vaultId))
    await within(dialog).findByLabelText('Người thi hành')
    await submit(dialog)
    expect(await screen.findByText(/Đã tạo hồ sơ #/)).toBeInTheDocument()
    expect(getDb().executorAssignments[vault.vaultId]).toMatchObject({ executorId: 5, status: 'AutoAssigned' })
  })

  it('executorSelect_AssignRejected_ShowsExecutorErrorAndDoesNotCreate', async () => {
    const vault = await seedReadyVault()
    server.use(http.put('*/api/owner/vaults/:vaultId/executor', () => HttpResponse.json({ status: 409, detail: 'Executor must be independent.' }, { status: 409 })))
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await userEvent.selectOptions(await within(dialog).findByLabelText('Kho cần bàn giao'), String(vault.vaultId))
    const select = await within(dialog).findByLabelText('Người thi hành')
    await within(select).findByRole('option', { name: /Trần Đăng Khoa/ })
    await userEvent.selectOptions(select, '21')
    await submit(dialog)
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Người thi hành này không khả dụng')
    expect(getDb().handovers).toHaveLength(0)
  })

  it('executorSelect_CreateFailsAfterAssign_TellsExecutorWasAlreadyAssigned', async () => {
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    const select = await within(dialog).findByLabelText('Người thi hành')
    await within(select).findByRole('option', { name: /Trần Đăng Khoa/ })
    await userEvent.selectOptions(select, '21')
    await submit(dialog)
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('giấy tờ')
    expect(alert).toHaveTextContent('đã được gán cho kho')
  })

  it('executorSelect_RetryAfterCreateFailure_DoesNotAssignTwice', async () => {
    let puts = 0
    server.use(
      http.put('*/api/owner/vaults/:vaultId/executor', () => {
        puts += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    const select = await within(dialog).findByLabelText('Người thi hành')
    await within(select).findByRole('option', { name: /Trần Đăng Khoa/ })
    await userEvent.selectOptions(select, '21')
    await submit(dialog)
    await within(dialog).findByRole('alert')
    await submit(dialog)
    await within(dialog).findByRole('alert')
    expect(puts).toBe(1)
  })

  it('executorSelect_ListFails_StillAllowsSystemChoice', async () => {
    server.use(http.get('*/api/owner/executors', () => HttpResponse.json({ status: 500, detail: 'x' }, { status: 500 })))
    const vault = await seedReadyVault()
    renderPage()
    await waitForPage()
    const dialog = await openModal()
    await userEvent.selectOptions(await within(dialog).findByLabelText('Kho cần bàn giao'), String(vault.vaultId))
    expect(await within(dialog).findByText('Không tải được danh sách người thi hành, hệ thống sẽ tự chọn.')).toBeInTheDocument()
    await submit(dialog)
    expect(await screen.findByText(/Đã tạo hồ sơ #/)).toBeInTheDocument()
  })

  it('executorSelect_HybridMode_IsHiddenBecauseMockListDoesNotMatchRealAccounts', async () => {
    renderPage({ mockMode: 'hybrid' })
    await waitForPage()
    const dialog = await openModal()
    await within(dialog).findByLabelText('Kho cần bàn giao')
    expect(within(dialog).queryByLabelText('Người thi hành')).not.toBeInTheDocument()
  })
})

describe('OwnerHandoversPage Executor column', () => {
  it('row_ShowsExecutorIdFromBackend', async () => {
    await seedHandover('Pending_Executor')
    renderPage()
    await waitForPage()
    const table = screen.getByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    expect(within(table).getByRole('columnheader', { name: 'Người thi hành' })).toBeInTheDocument()
    expect(within(table).getByText('Executor #5')).toBeInTheDocument()
  })
})
