import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { ROLE_ACCOUNTS, getDb, resetMockDb, saveDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import AdminEncryptionPage from './AdminEncryptionPage'

const server = setupServer(...handlers)
const admin = ROLE_ACCOUNTS.find((account) => account.role === 'Admin')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(admin.email, admin.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<AdminEncryptionPage mockMode="off" />)
const waitForPage = () => screen.findByRole('table', { name: 'Danh sách khóa mã hóa' })
const dataRows = () => within(screen.getByRole('table', { name: 'Danh sách khóa mã hóa' })).getAllByRole('row').slice(1)

describe('AdminEncryptionPage loading and error', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải thống kê khóa mã hóa')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/admin/system/key-rotation', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })

  it('render_NoKeys_ShowsEmptyMessageAndDisablesRotate', async () => {
    getDb().assets = []
    saveDb()
    renderPage()
    expect(await screen.findByText('Chưa có khóa mã hóa nào.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xoay vòng khóa' })).toBeDisabled()
  })
})

describe('AdminEncryptionPage content', () => {
  it('render_Ready_ShowsSummaryTilesAndPolicyInterval', async () => {
    renderPage()
    await waitForPage()
    const total = getDb().assets.length
    expect(screen.getByLabelText('Tổng số khóa')).toHaveTextContent(String(total))
    expect(screen.getByLabelText('Khóa đang hoạt động')).toHaveTextContent(String(total))
    expect(screen.getByLabelText('Khóa đã xoay')).toHaveTextContent('0')
    expect(screen.getByLabelText('Khóa cần xoay')).toHaveTextContent(String(total))
    expect(screen.getByText(/Chu kỳ xoay khóa: 90 ngày/)).toBeInTheDocument()
    expect(screen.getByText(/Chưa từng xoay khóa/)).toBeInTheDocument()
  })

  it('render_Keys_ShowsOneRowPerKeyWithAssetNameVersionAndNeedsRotationBadge', async () => {
    renderPage()
    await waitForPage()
    const rows = dataRows()
    expect(rows).toHaveLength(getDb().assets.length)
    expect(rows[0]).toHaveTextContent(getDb().assets[0].name)
    expect(rows[0]).toHaveTextContent('AES-256-GCM')
    expect(rows[0]).toHaveTextContent('Cần xoay')
  })
})

describe('AdminEncryptionPage key rotation', () => {
  it('rotate_ClickButton_OpensConfirmDialogWithoutCallingApi', async () => {
    let called = false
    server.use(
      http.post('*/api/admin/system/key-rotation/rotate', () => {
        called = true
        return HttpResponse.json({})
      }),
    )
    renderPage()
    await waitForPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xoay vòng khóa' }))
    const dialog = screen.getByRole('dialog', { name: 'Xoay vòng khóa mã hóa' })
    expect(dialog).toHaveTextContent(`${getDb().assets.length} khóa`)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('rotate_Confirm_BumpsKeyVersionsAndShowsToast', async () => {
    renderPage()
    await waitForPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xoay vòng khóa' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận xoay khóa' }))
    expect(await screen.findByText('Đã xoay vòng khóa mã hóa')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Khóa đã xoay')).toHaveTextContent(String(getDb().assets.length)))
    expect(screen.getByLabelText('Khóa cần xoay')).toHaveTextContent('0')
    expect(dataRows()[0]).not.toHaveTextContent('Cần xoay')
    expect(dataRows()[0]).toHaveTextContent('v2')
  })

  it('rotate_ApiFails_KeepsDialogOpenWithError', async () => {
    server.use(http.post('*/api/admin/system/key-rotation/rotate', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    await waitForPage()
    await userEvent.click(screen.getByRole('button', { name: 'Xoay vòng khóa' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận xoay khóa' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('render_FullMock_ShowsMockNotice', async () => {
    renderWithProviders(<AdminEncryptionPage mockMode="full" />)
    await waitForPage()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})
