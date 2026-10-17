import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { createHandover } from '../../callapi/executorApi'
import { ROLE_ACCOUNTS, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import { HANDOVER_GROUPS } from '../../utils/handover'
import ExecutorHandoverListPage from './ExecutorHandoverListPage'

const server = setupServer(...handlers)
const EXECUTOR = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(EXECUTOR.email, EXECUTOR.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderList = (props = {}) =>
  renderWithProviders(
    <ExecutorHandoverListPage title="Hồ sơ chờ thẩm định" description="Mô tả mục" statuses={HANDOVER_GROUPS.pending} emptyMessage="Không có hồ sơ chờ thẩm định." {...props} />,
  )

// Tạo thêm hồ sơ ở các trạng thái khác nhau bằng cách sửa trực tiếp dữ liệu mock
async function seedHandovers(statuses) {
  for (const status of statuses) {
    await createHandover(1)
    const record = getDb().handovers.at(-1)
    record.status = status
  }
}

describe('ExecutorHandoverListPage', () => {
  it('render_Title_ShowsHeadingAndDescription', async () => {
    renderList()
    expect(await screen.findByRole('heading', { level: 1, name: 'Hồ sơ chờ thẩm định' })).toBeInTheDocument()
    expect(screen.getByText('Mô tả mục')).toBeInTheDocument()
  })

  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderList()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải hồ sơ')
    await screen.findByRole('heading', { level: 1 })
  })

  it('render_NoMatchingHandover_ShowsEmptyMessage', async () => {
    renderList()
    expect(await screen.findByText('Không có hồ sơ chờ thẩm định.')).toBeInTheDocument()
  })

  it('render_OnlyHandoversOfTheGroup_AreListed', async () => {
    await seedHandovers(['Cancelled', 'Pending_Legal'])
    renderList()
    const table = await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Chờ thẩm định pháp lý')
  })

  it('render_HistoryGroup_ShowsCompletedAndCancelled', async () => {
    await seedHandovers(['Cancelled', 'Completed'])
    renderList({ title: 'Lịch sử', statuses: HANDOVER_GROUPS.history })
    const table = await screen.findByRole('table', { name: 'Danh sách hồ sơ bàn giao' })
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(2)
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/executor/handovers', () => HttpResponse.json({ status: 500, detail: 'Lỗi tải.' }, { status: 500 })))
    renderList()
    expect(await screen.findByRole('alert')).toHaveTextContent('Lỗi tải.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
