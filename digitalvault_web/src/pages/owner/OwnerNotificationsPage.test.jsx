import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { NOTIFICATIONS_CHANGED_EVENT } from '../../hooks/useUnreadNotifications'
import { DEMO_ACCOUNT, getDb, resetMockDb, saveDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import OwnerNotificationsPage from './OwnerNotificationsPage'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderPage = (props = {}) =>
  renderWithProviders(<OwnerNotificationsPage mockMode="off" {...props} />, {
    route: '/owner/notifications',
    path: '/owner/notifications',
    extraRoutes: [{ path: '/owner/handovers/:requestId', element: <p>handover-detail-page</p> }],
  })
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Thông báo' })
const list = () => screen.getByRole('list', { name: 'Danh sách thông báo' })
const items = () => within(list()).getAllByRole('listitem')

// Thông báo mới nhất có mã lớn nhất như BE
function seed(rows) {
  getDb().notifications = rows.map((row, index) => ({
    notificationId: index + 1,
    userId: DEMO_ACCOUNT.userId,
    type: 'Handover',
    title: 'Executor accepted handover',
    message: 'The assigned Executor accepted your handover request.',
    isRead: false,
    createdAt: new Date(Date.now() - (rows.length - index) * 3600000).toISOString(),
    ...row,
  }))
  saveDb()
}

describe('OwnerNotificationsPage loading, error and empty', () => {
  it('render_WhileFetching_ShowsLoadingStatus', async () => {
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải thông báo')
    await waitForPage()
  })

  it('render_ApiFails_ShowsErrorWithRetry', async () => {
    server.use(http.get('*/api/notifications', () => HttpResponse.json({ status: 500, detail: 'Máy chủ đang bận.' }, { status: 500 })))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    server.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await waitForPage()).toBeInTheDocument()
  })

  it('render_NoNotifications_ShowsEmptyMessage', async () => {
    renderPage()
    await waitForPage()
    expect(await screen.findByText('Bạn chưa có thông báo nào.')).toBeInTheDocument()
  })
})

describe('OwnerNotificationsPage list', () => {
  it('render_Notifications_ShowsNewestFirstWithVietnameseTitles', async () => {
    seed([
      { title: 'Executor accepted handover' },
      { title: 'Executor declined handover', message: 'Handover #4: Tôi đang bận công tác' },
    ])
    renderPage()
    await waitForPage()
    const rows = await waitFor(() => {
      const found = items()
      expect(found).toHaveLength(2)
      return found
    })
    expect(rows[0]).toHaveTextContent('Executor đã từ chối hồ sơ bàn giao')
    expect(rows[0]).toHaveTextContent('Lý do: Tôi đang bận công tác')
    expect(rows[1]).toHaveTextContent('Executor đã tiếp nhận hồ sơ bàn giao')
  })

  it('render_UnreadAndRead_MarkUnreadOnesAndCountThemInSummary', async () => {
    seed([{ isRead: true }, { isRead: false }, { isRead: false }])
    renderPage()
    await waitForPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    expect(screen.getByText('2 chưa đọc')).toBeInTheDocument()
    expect(within(list()).getAllByText('Chưa đọc')).toHaveLength(2)
  })

  it('filter_Unread_HidesReadNotifications', async () => {
    seed([{ isRead: true, title: 'Vault assignment revoked', type: 'Assignment', message: 'x' }, { isRead: false }])
    renderPage()
    await waitForPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    await userEvent.click(screen.getByRole('button', { name: 'Chưa đọc' }))
    expect(items()).toHaveLength(1)
    expect(screen.queryByText('Phân công Executor đã bị thu hồi')).not.toBeInTheDocument()
  })

  it('filter_UnreadWithNothingUnread_ShowsEmptyUnreadMessage', async () => {
    seed([{ isRead: true }])
    renderPage()
    await waitForPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    await userEvent.click(screen.getByRole('button', { name: 'Chưa đọc' }))
    expect(screen.getByText('Không có thông báo chưa đọc.')).toBeInTheDocument()
  })

  it('link_HandoverNotification_OpensHandoverDetail', async () => {
    seed([{ title: 'Executor declined handover', message: 'Handover #4: Bận' }])
    renderPage()
    await waitForPage()
    await userEvent.click(await screen.findByRole('link', { name: 'Xem hồ sơ #4' }))
    expect(await screen.findByText('handover-detail-page')).toBeInTheDocument()
  })

  it('link_NotificationWithoutHandoverNumber_HasNoLink', async () => {
    seed([{ type: 'Assignment', title: 'Vault assignment revoked', message: 'The Owner revoked your vault assignment.' }])
    renderPage()
    await waitForPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    expect(screen.queryByRole('link', { name: /Xem hồ sơ/ })).not.toBeInTheDocument()
  })

  it('render_OtherUsersNotifications_AreNotShown', async () => {
    seed([{ userId: 2 }])
    renderPage()
    await waitForPage()
    expect(await screen.findByText('Bạn chưa có thông báo nào.')).toBeInTheDocument()
  })
})

describe('OwnerNotificationsPage mark as read', () => {
  it('markRead_Single_CallsApiUpdatesRowAndBroadcastsChange', async () => {
    seed([{ isRead: false }])
    const changed = vi.fn()
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, changed)
    renderPage()
    await waitForPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Đánh dấu đã đọc' }))
    await waitFor(() => expect(screen.queryByText('Chưa đọc', { selector: 'span' })).not.toBeInTheDocument())
    expect(getDb().notifications[0].isRead).toBe(true)
    expect(changed).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã đọc' })).not.toBeInTheDocument()
    window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, changed)
  })

  it('markRead_ApiFails_KeepsUnreadAndShowsError', async () => {
    seed([{ isRead: false }])
    server.use(http.post('*/api/notifications/:notificationId/read', () => HttpResponse.json({ status: 500, detail: 'x' }, { status: 500 })))
    renderPage()
    await waitForPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Đánh dấu đã đọc' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không đánh dấu được thông báo')
    expect(screen.getByRole('button', { name: 'Đánh dấu đã đọc' })).toBeInTheDocument()
  })

  it('markAll_UnreadOnPage_MarksEveryOneAndDisablesButton', async () => {
    seed([{ isRead: false }, { isRead: false }, { isRead: true }])
    renderPage()
    await waitForPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }))
    // Nút cũng bị khóa trong lúc đang đánh dấu nên chờ số chưa đọc về 0 mới là xong
    expect(await screen.findByText('0 chưa đọc')).toBeInTheDocument()
    expect(getDb().notifications.every((item) => item.isRead)).toBe(true)
    expect(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' })).toBeDisabled()
  })

  it('markAll_PartialFailure_ReportsHowManyFailed', async () => {
    seed([{ isRead: false }, { isRead: false }])
    server.use(http.post('*/api/notifications/2/read', () => HttpResponse.json({ status: 500, detail: 'x' }, { status: 500 })))
    renderPage()
    await waitForPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('1 thông báo chưa đánh dấu được')
    expect(screen.getByText('1 chưa đọc')).toBeInTheDocument()
  })

  it('markAll_NothingUnread_ButtonIsDisabled', async () => {
    seed([{ isRead: true }])
    renderPage()
    await waitForPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    expect(screen.getByRole('button', { name: 'Đánh dấu tất cả đã đọc' })).toBeDisabled()
  })
})

describe('OwnerNotificationsPage paging and refresh', () => {
  it('pager_FullPage_AllowsNextPage', async () => {
    seed(Array.from({ length: 12 }, (_, index) => ({ message: `Handover #${index + 1}: x`, title: 'Executor declined handover' })))
    renderPage()
    await waitForPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    await userEvent.selectOptions(screen.getByLabelText('Số lượng'), '10')
    await waitFor(() => expect(items()).toHaveLength(10))
    await userEvent.click(screen.getByRole('button', { name: /Tiếp/ }))
    expect(await screen.findByText('Trang 2')).toBeInTheDocument()
    await waitFor(() => expect(items()).toHaveLength(2))
  })

  it('refresh_Click_LoadsNewNotifications', async () => {
    renderPage()
    await waitForPage()
    await screen.findByText('Bạn chưa có thông báo nào.')
    seed([{ isRead: false }])
    await userEvent.click(screen.getByRole('button', { name: 'Làm mới' }))
    expect(await screen.findByRole('list', { name: 'Danh sách thông báo' })).toBeInTheDocument()
  })

  it('render_FullMock_ShowsMockNotice', async () => {
    renderPage({ mockMode: 'full' })
    await waitForPage()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})
