import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { login } from '../callapi/authApi'
import { DEMO_ACCOUNT, getDb, resetMockDb, saveDb } from '../mocks/db'
import { handlers } from '../mocks/handlers'
import { notifyNotificationsChanged, useUnreadNotifications } from './useUnreadNotifications'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const seed = (flags) => {
  getDb().notifications = flags.map((isRead, index) => ({
    notificationId: index + 1,
    userId: DEMO_ACCOUNT.userId,
    type: 'Handover',
    title: 'Executor accepted handover',
    message: 'x',
    isRead,
    createdAt: new Date().toISOString(),
  }))
  saveDb()
}

describe('useUnreadNotifications', () => {
  it('count_OnlyUnreadOnes_AreCounted', async () => {
    seed([false, true, false])
    const { result } = renderHook(() => useUnreadNotifications())
    await waitFor(() => expect(result.current).toBe(2))
  })

  it('count_NoNotifications_IsZero', async () => {
    const { result } = renderHook(() => useUnreadNotifications())
    await waitFor(() => expect(result.current).toBe(0))
  })

  it('count_ChangeEvent_ReloadsFromServer', async () => {
    seed([false, false])
    const { result } = renderHook(() => useUnreadNotifications())
    await waitFor(() => expect(result.current).toBe(2))
    await axiosClient.post('/notifications/1/read')
    act(() => notifyNotificationsChanged())
    await waitFor(() => expect(result.current).toBe(1))
  })

  it('count_ApiFails_StaysZeroInsteadOfBreakingTheLayout', async () => {
    server.use(http.get('*/api/notifications', () => HttpResponse.json({ status: 500, detail: 'x' }, { status: 500 })))
    seed([false])
    const { result } = renderHook(() => useUnreadNotifications())
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(result.current).toBe(0)
  })

  it('count_AfterUnmount_ListenerIsRemoved', async () => {
    seed([false])
    const { result, unmount } = renderHook(() => useUnreadNotifications())
    await waitFor(() => expect(result.current).toBe(1))
    unmount()
    expect(() => notifyNotificationsChanged()).not.toThrow()
  })
})
