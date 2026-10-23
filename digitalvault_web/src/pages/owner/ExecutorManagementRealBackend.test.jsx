import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login, register } from '../../callapi/authApi'
import { createVault } from '../../callapi/ownerApi'
import { resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import ExecutorManagementPage from './ExecutorManagementPage'

// Mô phỏng BE thật (chế độ "off"): không có GET .../executor (trả 405), danh sách Executor dạng PageDto chỉ có userId và fullName
const server = setupServer(...handlers)

const CANDIDATES = [
  { userId: 15, fullName: 'Nguyen Van A' },
  { userId: 16, fullName: 'Tran Thi B' },
]

function useRealBackend({ list = CANDIDATES, assignStatus = 204, onList = () => {} } = {}) {
  server.use(
    http.get('*/api/owner/vaults/:vaultId/executor', () => HttpResponse.json({ status: 405, detail: 'Method not allowed.' }, { status: 405 })),
    http.get('*/api/owner/executors', ({ request }) => {
      onList(new URL(request.url).searchParams)
      return HttpResponse.json({ page: 1, pageSize: 100, items: list })
    }),
    http.get('*/api/owner/executors/:executorId', ({ params }) => {
      const found = CANDIDATES.find((item) => item.userId === Number(params.executorId))
      return found ? HttpResponse.json({ ...found, role: 'Executor', status: 'Active', joinedAt: '2026-10-01T02:00:00Z' }) : HttpResponse.json({ status: 404, detail: 'x' }, { status: 404 })
    }),
    http.put('*/api/owner/vaults/:vaultId/executor', () =>
      assignStatus === 204 ? new HttpResponse(null, { status: 204 }) : HttpResponse.json({ status: assignStatus, detail: 'Executor must be independent.' }, { status: assignStatus }),
    ),
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  // Chủ sở hữu mới có đúng một kho và chưa gán người thi hành
  await register({ fullName: 'Chủ Mới', email: 'moi@example.com', phone: '', password: 'Registration123!', confirmPassword: 'Registration123!' })
  await login('moi@example.com', 'Registration123!')
  await createVault({ name: 'Kho mới', description: '' })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<ExecutorManagementPage mockMode="off" />)
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Người thi hành (Executor)' })
const openPicker = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Chọn người thi hành' }))
  return screen.getByRole('dialog', { name: 'Chọn Người Thi Hành' })
}

describe('ExecutorManagementPage against the real backend', () => {
  it('render_BackendCannotShowCurrentExecutor_ShowsNeutralNoticeInsteadOfError', async () => {
    useRealBackend()
    renderPage()
    await waitForPage()
    expect(await screen.findByText(/chưa cung cấp thông tin người thi hành hiện tại/)).toBeInTheDocument()
    expect(screen.queryByText('Đã có lỗi xảy ra, vui lòng thử lại.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn người thi hành' })).toBeEnabled()
  })

  it('render_Process_DoesNotPromiseAutomaticTriggerByLifeConfirmation', async () => {
    useRealBackend()
    renderPage()
    await waitForPage()
    expect(screen.queryByText(/điểm danh sự sống quá hạn/)).not.toBeInTheDocument()
    expect(screen.getByText(/tiếp nhận hoặc từ chối/)).toBeInTheDocument()
  })

  it('picker_Listing_ShowsNamesFromApiWithoutManualIdField', async () => {
    useRealBackend()
    renderPage()
    const dialog = await (async () => {
      await waitForPage()
      return openPicker()
    })()
    expect(await within(dialog).findByRole('radio', { name: /Nguyen Van A/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: /Tran Thi B/ })).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/^ID người thi hành/)).not.toBeInTheDocument()
  })

  it('picker_Search_SendsSearchAndVaultIdToApi', async () => {
    const seen = []
    useRealBackend({ onList: (params) => seen.push(Object.fromEntries(params)) })
    renderPage()
    await waitForPage()
    const dialog = await openPicker()
    await within(dialog).findByRole('radio', { name: /Nguyen Van A/ })
    await userEvent.type(within(dialog).getByLabelText('Tìm người thi hành'), 'Tran')
    await within(dialog).findByRole('radio', { name: /Nguyen Van A/ })
    await vi.waitFor(() => expect(seen.some((params) => params.search === 'Tran')).toBe(true))
    expect(seen.every((params) => typeof params.vaultId === 'string')).toBe(true)
  })

  it('picker_NoEligibleExecutor_ShowsEmptyMessage', async () => {
    useRealBackend({ list: [] })
    renderPage()
    await waitForPage()
    const dialog = await openPicker()
    expect(await within(dialog).findByText('Không có người thi hành phù hợp.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' })).toBeDisabled()
  })

  it('assign_Selected_ShowsCardWithNameAndWithoutRevokeOrLegalProfile', async () => {
    useRealBackend()
    renderPage()
    await waitForPage()
    const dialog = await openPicker()
    await userEvent.click(await within(dialog).findByRole('radio', { name: /Nguyen Van A/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' }))
    const card = await screen.findByRole('region', { name: 'Người thi hành hiện tại' })
    expect(within(card).getByRole('heading', { name: 'Nguyen Van A' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Đổi người thi hành' })).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Thu hồi ủy quyền' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: 'Xem hồ sơ pháp lý' })).not.toBeInTheDocument()
    expect(card).not.toHaveTextContent('Thẻ LS')
    expect(card).not.toHaveTextContent('undefined')
  })

  it('assign_ServerRejects409_ShowsErrorInsideDialog', async () => {
    useRealBackend({ assignStatus: 409 })
    renderPage()
    await waitForPage()
    const dialog = await openPicker()
    await userEvent.click(await within(dialog).findByRole('radio', { name: /Tran Thi B/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Người thi hành này không khả dụng')
  })

  it('assign_DetailLookupFails_FallsBackToIdLabel', async () => {
    useRealBackend({ list: [{ userId: 99, fullName: 'Le Van C' }] })
    renderPage()
    await waitForPage()
    const dialog = await openPicker()
    await userEvent.click(await within(dialog).findByRole('radio', { name: /Le Van C/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận ủy quyền' }))
    expect(await screen.findByRole('heading', { name: 'Executor #99' })).toBeInTheDocument()
  })
})
