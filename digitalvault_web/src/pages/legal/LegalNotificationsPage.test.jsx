import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getNotificationPage, markNotificationRead } from '../../callapi/ownerApi'
import LegalNotificationsPage from './LegalNotificationsPage'

vi.mock('../../callapi/ownerApi', () => ({ getNotificationPage: vi.fn(), markNotificationRead: vi.fn() }))

const note = (notificationId, extra = {}) => ({
  notificationId,
  type: 'Handover',
  title: 'Legal verification requested',
  message: `Handover #${notificationId + 10} needs your review`,
  isRead: false,
  createdAt: '2026-10-24T09:00:00',
  ...extra,
})

const renderPage = () =>
  render(
    <MemoryRouter>
      <LegalNotificationsPage />
    </MemoryRouter>,
  )

describe('LegalNotificationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getNotificationPage.mockResolvedValue({ page: 1, pageSize: 20, items: [note(1), note(2, { isRead: true, title: 'Đã xem' })] })
  })

  it('list_Loaded_ShowsNotificationsWithUnreadCountAndLinkToHandover', async () => {
    renderPage()
    const list = await screen.findByRole('list', { name: 'Danh sách thông báo' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('1 chưa đọc')).toBeInTheDocument()
    expect(within(list).getByRole('link', { name: 'Xem hồ sơ #11' })).toHaveAttribute('href', '/verifier/handovers/11')
  })

  it('list_EnglishNotification_IsShownInVietnamese', async () => {
    renderPage()
    // Cả hai thông báo mẫu đều nhắc yêu cầu thẩm định nên cùng được dịch
    expect((await screen.findAllByText('Có hồ sơ mới cần thẩm định pháp lý')).length).toBe(2)
    expect(screen.getByText('Hồ sơ #11 đã được gửi đến bạn để thẩm định.')).toBeInTheDocument()
    expect(screen.queryByText('Legal verification requested')).not.toBeInTheDocument()
  })

  it('filter_Unread_HidesReadNotifications', async () => {
    renderPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    fireEvent.click(screen.getByRole('button', { name: 'Chưa đọc' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByText('Đã xem')).not.toBeInTheDocument()
  })

  it('markRead_Clicked_CallsApiAndRemovesUnreadBadge', async () => {
    markNotificationRead.mockResolvedValue(undefined)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Đánh dấu đã đọc' }))
    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith(1))
    expect(await screen.findByText('0 chưa đọc')).toBeInTheDocument()
  })

  it('markAll_Clicked_MarksEveryUnreadNotificationOfThePage', async () => {
    markNotificationRead.mockResolvedValue(undefined)
    getNotificationPage.mockResolvedValue({ page: 1, pageSize: 20, items: [note(1), note(2), note(3, { isRead: true })] })
    renderPage()
    await screen.findByRole('list', { name: 'Danh sách thông báo' })
    fireEvent.click(screen.getByRole('button', { name: /Đánh dấu tất cả đã đọc/ }))
    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('0 chưa đọc')).toBeInTheDocument()
  })

  it('markRead_ServerFails_ShowsError', async () => {
    markNotificationRead.mockRejectedValue(new Error('boom'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Đánh dấu đã đọc' }))
    expect(await screen.findByText('Không đánh dấu được thông báo. Vui lòng thử lại.')).toBeInTheDocument()
  })

  it('list_Empty_ShowsEmptyMessage', async () => {
    getNotificationPage.mockResolvedValue({ page: 1, pageSize: 20, items: [] })
    renderPage()
    expect(await screen.findByText('Bạn chưa có thông báo nào.')).toBeInTheDocument()
  })

  it('list_ApiFails_ShowsErrorAndRetryReloads', async () => {
    getNotificationPage.mockRejectedValueOnce(new Error('Máy chủ đang bận.')).mockResolvedValue({ page: 1, pageSize: 20, items: [note(1)] })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang bận.')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('list', { name: 'Danh sách thông báo' })).toBeInTheDocument()
  })
})
