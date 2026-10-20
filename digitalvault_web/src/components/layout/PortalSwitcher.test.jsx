import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getPortalPreference, PORTAL_STORAGE_KEY } from '../../utils/portalPreference'
import PortalSwitcher from './PortalSwitcher'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))

beforeEach(() => sessionStorage.removeItem(PORTAL_STORAGE_KEY))

const renderAt = (roles, path = '/owner/assets') => {
  useAuth.mockReturnValue({ user: { userId: 1, roles, email: 'a@example.com' } })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/owner/*" element={<><PortalSwitcher /><p>owner-page</p></>} />
        <Route path="/beneficiary/*" element={<><PortalSwitcher /><p>beneficiary-page</p></>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PortalSwitcher', () => {
  it('render_SingleRole_ShowsNothing', () => {
    renderAt(['Owner'])
    expect(screen.queryByRole('navigation', { name: 'Chuyển cổng' })).not.toBeInTheDocument()
  })

  it('render_NoUser_ShowsNothing', () => {
    useAuth.mockReturnValue({ user: null })
    render(<MemoryRouter><PortalSwitcher /></MemoryRouter>)
    expect(screen.queryByRole('navigation', { name: 'Chuyển cổng' })).not.toBeInTheDocument()
  })

  it('render_TwoRoles_ListsPortalsAndMarksCurrentAsDisabled', () => {
    renderAt(['Owner', 'Beneficiary'])
    expect(screen.getByRole('button', { name: 'Chủ sở hữu kho (đang dùng)' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Người thụ hưởng' })).toBeEnabled()
  })

  it('click_OtherPortal_NavigatesAndRemembersChoice', async () => {
    renderAt(['Owner', 'Beneficiary'])
    await userEvent.click(screen.getByRole('button', { name: 'Người thụ hưởng' }))
    expect(await screen.findByText('beneficiary-page')).toBeInTheDocument()
    expect(getPortalPreference()).toBe('Beneficiary')
    expect(screen.getByRole('button', { name: 'Người thụ hưởng (đang dùng)' })).toBeDisabled()
  })
})
