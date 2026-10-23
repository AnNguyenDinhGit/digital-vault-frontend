import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login, register } from '../../callapi/authApi'
import { createVault } from '../../callapi/ownerApi'
import { DEMO_ACCOUNT, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import ExecutorManagementPage from './ExecutorManagementPage'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = (props = {}) => renderWithProviders(<ExecutorManagementPage mockMode="full" {...props} />)
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Người thi hành (Executor)' })

// Chủ sở hữu mới có đúng một kho và chưa gán người thi hành
async function loginAsOwnerWithEmptyVault() {
  await register({ fullName: 'Chủ Mới', email: 'moi@example.com', phone: '', password: 'Registration123!', confirmPassword: 'Registration123!' })
  await login('moi@example.com', 'Registration123!')
  return createVault({ name: 'Kho mới', description: '' })
}

describe('ExecutorManagementPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải thông tin người thi hành')
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

describe('ExecutorManagementPage current executor', () => {
  it('render_VaultWithExecutor_ShowsProfileAndContract', async () => {
    renderPage()
    await waitForPage()
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    expect(within(card).getByRole('heading', { name: 'LS. Lê Hoàng Nam' })).toBeInTheDocument()
    expect(card).toHaveTextContent('Văn phòng Luật sư Trí Minh')
    expect(card).toHaveTextContent('Thẻ LS: EX-9021')
    expect(card).toHaveTextContent('Đang hiệu lực')
    expect(card).toHaveTextContent('HD-UQ-2026-0001')
    expect(card).toHaveTextContent('6 tài sản')
  })

  it('render_NoVault_ShowsMessageToCreateVaultFirst', async () => {
    await register({ fullName: 'Chủ Mới', email: 'moi@example.com', phone: '', password: 'Registration123!', confirmPassword: 'Registration123!' })
    await login('moi@example.com', 'Registration123!')
    renderPage()
    expect(await screen.findByText('Bạn cần có ít nhất một kho để gán người thi hành.')).toBeInTheDocument()
  })

  it('render_TwoVaults_ShowsVaultSelectorAndSwitchesExecutor', async () => {
    await createVault({ name: 'Kho thứ hai', description: '' })
    renderPage()
    await waitForPage()
    await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Chọn kho' }), 'Kho thứ hai')
    expect(await screen.findByText('Kho này chưa có người thi hành.')).toBeInTheDocument()
  })

  it('render_Process_ShowsRevokeExplanation', async () => {
    renderPage()
    await waitForPage()
    expect(screen.getByRole('heading', { name: 'Quy trình thi hành bàn giao' })).toBeInTheDocument()
    expect(screen.getByText(/toàn quyền hủy bỏ hoặc thay thế Executor/)).toBeInTheDocument()
  })
})

describe('ExecutorManagementPage assign', () => {
  it('assign_VaultWithoutExecutor_ShowsEmptyStateAndOpensPicker', async () => {
    await loginAsOwnerWithEmptyVault()
    renderPage()
    expect(await screen.findByText('Kho này chưa có người thi hành.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Chọn người thi hành' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn Người Thi Hành' })
    expect(await within(dialog).findAllByRole('radio')).toHaveLength(3)
    expect(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' })).toBeDisabled()
  })

  it('assign_PickExecutorAndConfirm_ShowsPendingExecutorCard', async () => {
    await loginAsOwnerWithEmptyVault()
    renderPage()
    await screen.findByText('Kho này chưa có người thi hành.')
    await userEvent.click(screen.getByRole('button', { name: 'Chọn người thi hành' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn Người Thi Hành' })
    await userEvent.click(await within(dialog).findByRole('radio', { name: /Trần Đăng Khoa/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' }))
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    expect(card).toHaveTextContent('LS. Trần Đăng Khoa')
    expect(card).toHaveTextContent('Đang hiệu lực')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('assign_ChangeExecutor_ReplacesCurrentOne', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    await userEvent.click(within(card).getByRole('button', { name: 'Đổi người thi hành' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn Người Thi Hành' })
    expect(await within(dialog).findByRole('radio', { name: /Lê Hoàng Nam/ })).toBeChecked()
    await userEvent.click(await within(dialog).findByRole('radio', { name: /Nguyễn Hải Yến/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' }))
    expect(await screen.findByRole('heading', { name: 'LS. Nguyễn Hải Yến' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Người thi hành hiện tại' })).toHaveTextContent('Đang hiệu lực')
  })

  it('assign_ServerRejects_ShowsErrorInsideDialog', async () => {
    server.use(http.put('*/api/owner/vaults/:vaultId/executor', () => HttpResponse.json({ status: 404, detail: 'Executor not found.' }, { status: 404 })))
    renderPage()
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    await userEvent.click(within(card).getByRole('button', { name: 'Đổi người thi hành' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn Người Thi Hành' })
    await userEvent.click(await within(dialog).findByRole('radio', { name: /Nguyễn Hải Yến/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Không tìm thấy người thi hành đã chọn.')
  })

  it('assign_Cancel_ClosesPicker', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    await userEvent.click(within(card).getByRole('button', { name: 'Đổi người thi hành' }))
    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('ExecutorManagementPage revoke', () => {
  it('revoke_ConfirmDialog_ExplainsAndRevokesAuthorization', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    await userEvent.click(within(card).getByRole('button', { name: 'Thu hồi ủy quyền' }))
    const dialog = screen.getByRole('dialog', { name: 'Thu Hồi Ủy Quyền Người Thi Hành' })
    expect(dialog).toHaveTextContent('LS. Lê Hoàng Nam')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thu hồi' }))
    expect(await screen.findByText('Kho này chưa có người thi hành.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Người thi hành hiện tại' })).not.toBeInTheDocument()
  })

  it('revoke_Cancel_KeepsExecutor', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    await userEvent.click(within(card).getByRole('button', { name: 'Thu hồi ủy quyền' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hủy' }))
    expect(screen.getByRole('region', { name: 'Người thi hành hiện tại' })).toBeInTheDocument()
  })
})

describe('ExecutorManagementPage legal profile', () => {
  it('legalProfile_Opened_ShowsContractScopeAndUnlockConditions', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    await userEvent.click(within(card).getByRole('button', { name: 'Xem hồ sơ pháp lý' }))
    const dialog = screen.getByRole('dialog', { name: 'Hồ Sơ Pháp Lý Của Executor' })
    expect(dialog).toHaveTextContent('LS. Lê Hoàng Nam')
    expect(dialog).toHaveTextContent('Thẻ LS: EX-9021')
    expect(dialog).toHaveTextContent('HD-UQ-2026-0001')
    expect(dialog).toHaveTextContent('6 tài sản')
    expect(dialog).toHaveTextContent('giấy chứng tử')
  })

  it('legalProfile_Close_ClosesDialog', async () => {
    renderPage()
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    await userEvent.click(within(card).getByRole('button', { name: 'Xem hồ sơ pháp lý' }))
    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('ExecutorManagementPage backend integration', () => {
  it('notice_FullMock_UsesDefaultMockMessage', async () => {
    renderPage({ mockMode: 'full' })
    await waitForPage()
    expect(screen.getByRole('note')).toHaveTextContent('Dữ liệu mô phỏng')
  })

  it('notice_Hybrid_ExplainsOnlyAssigningReachesTheServer', async () => {
    renderPage({ mockMode: 'hybrid' })
    await waitForPage()
    expect(screen.getByRole('note')).toHaveTextContent('Chỉ thao tác gán hoặc đổi Executor được gửi lên máy chủ')
  })

  it('notice_Off_IsHidden', async () => {
    renderPage({ mockMode: 'off' })
    await waitForPage()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('card_NoLongerOffersAcceptSimulationBecauseBackendHasNoAcceptStep', async () => {
    renderPage({ mockMode: 'full' })
    await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    expect(screen.queryByRole('button', { name: /Mô phỏng Executor chấp nhận/ })).not.toBeInTheDocument()
  })

  it('picker_HybridMode_AsksForExecutorIdBecauseMockProfilesDoNotMatchRealAccounts', async () => {
    await loginAsOwnerWithEmptyVault()
    renderPage({ mockMode: 'hybrid' })
    await screen.findByText('Kho này chưa có người thi hành.')
    await userEvent.click(screen.getByRole('button', { name: 'Chọn người thi hành' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn Người Thi Hành' })
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^ID người thi hành/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' })).toBeEnabled()
  })

  it('picker_HybridModeInvalidId_ShowsErrorWithoutCallingServer', async () => {
    await loginAsOwnerWithEmptyVault()
    renderPage({ mockMode: 'hybrid' })
    await screen.findByText('Kho này chưa có người thi hành.')
    await userEvent.click(screen.getByRole('button', { name: 'Chọn người thi hành' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn Người Thi Hành' })
    await userEvent.type(within(dialog).getByLabelText(/^ID người thi hành/), '0')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' }))
    expect(await within(dialog).findByText('ID người thi hành phải là số nguyên dương.')).toBeInTheDocument()
  })

  it('picker_HybridModeValidId_AssignsAndShowsExecutorCard', async () => {
    await loginAsOwnerWithEmptyVault()
    renderPage({ mockMode: 'hybrid' })
    await screen.findByText('Kho này chưa có người thi hành.')
    await userEvent.click(screen.getByRole('button', { name: 'Chọn người thi hành' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn Người Thi Hành' })
    await userEvent.type(within(dialog).getByLabelText(/^ID người thi hành/), '22')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' }))
    expect(await screen.findByRole('heading', { name: 'LS. Nguyễn Hải Yến' })).toBeInTheDocument()
  })

  it('picker_HybridModeServerRejects_ShowsErrorInsideDialog', async () => {
    await loginAsOwnerWithEmptyVault()
    server.use(http.put('*/api/owner/vaults/:vaultId/executor', () => HttpResponse.json({ status: 409, detail: 'Executor is not available.' }, { status: 409 })))
    renderPage({ mockMode: 'hybrid' })
    await screen.findByText('Kho này chưa có người thi hành.')
    await userEvent.click(screen.getByRole('button', { name: 'Chọn người thi hành' }))
    const dialog = screen.getByRole('dialog', { name: 'Chọn Người Thi Hành' })
    await userEvent.type(within(dialog).getByLabelText(/^ID người thi hành/), '22')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Người thi hành này không khả dụng')
  })
})
