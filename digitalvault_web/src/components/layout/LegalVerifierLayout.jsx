import { AlertCircle, Bell, FileCheck2, LogOut, ShieldCheck, XCircle } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import { formatUnreadCount } from '../../utils/notifications'
import BrandLogo from '../common/BrandLogo'
import PortalSwitcher from './PortalSwitcher'

const VERIFIER_ITEMS = [
  { label: 'Hồ sơ chờ thẩm định', icon: FileCheck2, to: '/verifier/pending' },
  { label: 'Đã duyệt & Ký số', icon: ShieldCheck, to: '/verifier/approved' },
  { label: 'Yêu cầu bổ sung', icon: AlertCircle, to: '/verifier/additional-requests' },
  { label: 'Hồ sơ bị từ chối', icon: XCircle, to: '/verifier/rejected' },
]

const NOTIFICATION_ITEMS = [{ label: 'Thông báo', icon: Bell, to: '/verifier/notifications', unreadBadge: true }]

function initialsFromEmail(email = '') {
  const name = email.split('@')[0].replace(/[^a-zA-Z]/g, '')
  return (name.slice(0, 2) || 'LV').toUpperCase()
}

// Huy hiệu số thông báo chưa đọc cạnh mục Thông báo
function UnreadBadge() {
  const count = useUnreadNotifications()
  if (!count) return null
  return (
    <span className="av-badge av-badge-warn" aria-label={`${count} thông báo chưa đọc`}>
      {formatUnreadCount(count)}
    </span>
  )
}

function SidebarItem({ label, icon: Icon, to, unreadBadge }) {
  return (
    <NavLink to={to} className="av-nav-item">
      <Icon size={16} aria-hidden="true" />
      <span className="flex-grow-1 text-truncate" style={{ minWidth: 0 }}>{label}</span>
      {unreadBadge && <UnreadBadge />}
    </NavLink>
  )
}

function SidebarSection({ title, items }) {
  return (
    <div>
      <p className="av-section-title">{title}</p>
      <div className="mt-2 d-flex flex-column gap-1">
        {items.map((item) => (
          <SidebarItem key={item.label} {...item} />
        ))}
      </div>
    </div>
  )
}

export default function LegalVerifierLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="av-owner-shell">
      <aside className="av-sidebar">
        <div className="av-sidebar-head">
          <BrandLogo subtitle="NOTARY LEGAL PORTAL" />
        </div>

        <nav aria-label="Điều hướng Thẩm Định Pháp Lý" className="av-sidebar-nav d-flex flex-column gap-4">
          <SidebarSection title="THẨM ĐỊNH TƯ PHÁP" items={VERIFIER_ITEMS} />
          <SidebarSection title="THEO DÕI" items={NOTIFICATION_ITEMS} />
        </nav>

        <div className="d-flex flex-column gap-3 p-3" style={{ borderTop: '1px solid var(--av-slate-100)' }}>
          <div className="av-info-box" style={{ padding: 12 }}>
            <p className="d-flex align-items-center gap-2 mb-0 fs-12 fw-semibold text-brand">
              <ShieldCheck size={14} aria-hidden="true" />
              Cơ Quan Tư Pháp &amp; Công Chứng
            </p>
            <p className="mt-1 mb-0 fs-11 text-slate-500" style={{ lineHeight: 1.6 }}>
              Thẩm định hồ sơ nhân thân và tài liệu pháp lý trước khi bàn giao di sản số.
            </p>
          </div>

          <PortalSwitcher />

          <div className="av-user-box">
            <span className="av-avatar">{initialsFromEmail(user?.email)}</span>
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <p className="mb-0 text-truncate fs-12 fw-semibold text-ink">{user?.email}</p>
              <p className="mb-0 font-mono fs-10 text-slate-400">LEGAL VERIFIER</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="av-logout-btn"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-grow-1 p-4" style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}
