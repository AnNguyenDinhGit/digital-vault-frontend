import { Activity, Bell, FileCheck2, FolderLock, Key, LogOut, ShieldCheck } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import BrandLogo from '../common/BrandLogo'

const BENEFICIARY_ITEMS = [
  { label: 'Tài sản thụ hưởng', icon: FolderLock, to: '/beneficiary/assets' },
  { label: 'Tiến trình bàn giao', icon: Activity, to: '/beneficiary/status' },
  { label: 'Xác nhận & Biên nhận số', icon: FileCheck2, to: '/beneficiary/receipts' },
]

const SECURITY_ITEMS = [
  { label: 'Khóa giải mã cá nhân', icon: Key, to: '/beneficiary/keys' },
  { label: 'Thông báo & Tin nhắn', icon: Bell, to: '/beneficiary/notifications' },
]

function initialsFromEmail(email = '') {
  const name = email.split('@')[0].replace(/[^a-zA-Z]/g, '')
  return (name.slice(0, 2) || 'BE').toUpperCase()
}

function SidebarItem({ label, icon: Icon, to }) {
  return (
    <NavLink to={to} className="av-nav-item">
      <Icon size={16} aria-hidden="true" />
      <span className="flex-grow-1 text-truncate" style={{ minWidth: 0 }}>{label}</span>
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

export default function BeneficiaryLayout() {
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
          <BrandLogo subtitle="BENEFICIARY PORTAL" />
        </div>

        <nav aria-label="Điều hướng Người Thụ Hưởng" className="av-sidebar-nav d-flex flex-column gap-4">
          <SidebarSection title="THỪA KẾ DI SẢN" items={BENEFICIARY_ITEMS} />
          <SidebarSection title="BẢO MẬT &amp; HỖ TRỢ" items={SECURITY_ITEMS} />
        </nav>

        <div className="d-flex flex-column gap-3 p-3" style={{ borderTop: '1px solid var(--av-slate-100)' }}>
          <div className="av-info-box" style={{ padding: 12 }}>
            <p className="d-flex align-items-center gap-2 mb-0 fs-12 fw-semibold text-brand">
              <ShieldCheck size={14} aria-hidden="true" />
              Cổng Người Thụ Hưởng
            </p>
            <p className="mt-1 mb-0 fs-11 text-slate-500" style={{ lineHeight: 1.6 }}>
              Tiếp nhận, kiểm tra phân bổ và xác nhận nhận tài sản di sản số.
            </p>
          </div>

          <div className="av-user-box">
            <span className="av-avatar">{initialsFromEmail(user?.email)}</span>
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <p className="mb-0 text-truncate fs-12 fw-semibold text-ink">{user?.email}</p>
              <p className="mb-0 font-mono fs-10 text-slate-400">BENEFICIARY</p>
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
