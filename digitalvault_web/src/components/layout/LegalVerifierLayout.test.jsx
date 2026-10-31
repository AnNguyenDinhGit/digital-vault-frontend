import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LegalVerifierLayout from './LegalVerifierLayout'

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'verifier@example.com', roles: ['LegalVerifier'] }, logout: vi.fn() }) }))
vi.mock('../../hooks/useUnreadNotifications', () => ({ useUnreadNotifications: vi.fn() }))
vi.mock('./PortalSwitcher', () => ({ default: () => null }))

import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/verifier/pending']}>
      <Routes>
        <Route path="/verifier" element={<LegalVerifierLayout />}>
          <Route path="pending" element={<p>nội dung</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('LegalVerifierLayout', () => {
  beforeEach(() => useUnreadNotifications.mockReturnValue(0))

  it('menu_Items_ListsReviewGroupsRejectedAndNotificationsOnly', () => {
    renderLayout()
    const nav = screen.getByRole('navigation', { name: 'Điều hướng Thẩm Định Pháp Lý' })
    const labels = Array.from(nav.querySelectorAll('a')).map((link) => link.textContent.trim())
    expect(labels).toEqual(['Hồ sơ chờ thẩm định', 'Đã duyệt & Ký số', 'Yêu cầu bổ sung', 'Hồ sơ bị từ chối', 'Thông báo'])
    expect(screen.getByRole('link', { name: 'Hồ sơ bị từ chối' })).toHaveAttribute('href', '/verifier/rejected')
    expect(screen.getByRole('link', { name: 'Thông báo' })).toHaveAttribute('href', '/verifier/notifications')
  })

  it('menu_NoPlaceholderToolsRemain', () => {
    renderLayout()
    for (const name of [/RFC 3161/, /VNeID/, /SmartCA/, /Shamir/]) expect(screen.queryByRole('link', { name })).not.toBeInTheDocument()
  })

  it('notifications_Unread_ShowsBadgeWithCount', () => {
    useUnreadNotifications.mockReturnValue(3)
    renderLayout()
    expect(screen.getByLabelText('3 thông báo chưa đọc')).toHaveTextContent('3')
  })

  it('notifications_None_ShowsNoBadge', () => {
    renderLayout()
    expect(screen.queryByLabelText(/thông báo chưa đọc/)).not.toBeInTheDocument()
  })
})
