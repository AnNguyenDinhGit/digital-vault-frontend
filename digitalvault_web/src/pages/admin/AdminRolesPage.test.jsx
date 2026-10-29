import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { ROLE_ACCOUNTS, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import AdminRolesPage from './AdminRolesPage'

const server = setupServer(...handlers)
const admin = ROLE_ACCOUNTS.find((account) => account.role === 'Admin')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(admin.email, admin.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = () => renderWithProviders(<AdminRolesPage mockMode="off" />)
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Vai trò & phân quyền' })

describe('AdminRolesPage', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải ma trận phân quyền')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/admin/roles', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('article', { name: /Chủ sở hữu/ })).toBeInTheDocument()
  })

  it('render_Ready_ShowsOneCardPerRoleWithVietnameseNames', async () => {
    renderPage()
    await waitForPage()
    expect(await screen.findAllByRole('article')).toHaveLength(5)
    for (const name of ['Chủ sở hữu', 'Người thi hành', 'Người xác minh pháp lý', 'Người thụ hưởng', 'Quản trị viên']) {
      expect(screen.getByRole('article', { name: new RegExp(name) })).toBeInTheDocument()
    }
  })

  it('render_Role_ShowsDescriptionActiveUsersAndPermissionLabels', async () => {
    renderPage()
    await waitForPage()
    const card = await screen.findByRole('article', { name: /Chủ sở hữu/ })
    expect(within(card).getByText('Chủ sở hữu kho di sản số')).toBeInTheDocument()
    expect(within(card).getByText(/người dùng đang hoạt động/)).toBeInTheDocument()
    expect(within(card).getByText('Tạo kho')).toHaveAttribute('title', 'vault:create')
    expect(within(card).getAllByRole('listitem')).toHaveLength(8)
  })

  it('refresh_Click_ReloadsRoles', async () => {
    renderPage()
    await waitForPage()
    await screen.findAllByRole('article')
    await userEvent.click(screen.getByRole('button', { name: 'Làm mới' }))
    expect(await screen.findAllByRole('article')).toHaveLength(5)
  })

  it('render_FullMock_ShowsMockNotice', async () => {
    renderWithProviders(<AdminRolesPage mockMode="full" />)
    await waitForPage()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})
