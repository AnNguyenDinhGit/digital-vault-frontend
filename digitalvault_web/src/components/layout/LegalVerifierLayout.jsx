import { AlertCircle, BookOpen, FileCheck2, KeyRound, Lock, LogOut, Search, ShieldCheck } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import BrandLogo from '../common/BrandLogo'

const VERIFIER_ITEMS = [
  { label: 'Hồ sơ chờ thẩm định', icon: FileCheck2, to: '/verifier/pending' },
  { label: 'Đã duyệt & Ký số', icon: ShieldCheck, to: '/verifier/approved' },
  { label: 'Yêu cầu bổ sung', icon: AlertCircle, to: '/verifier/additional-requests' },
  { label: 'Sổ cái chứng thực RFC 3161', icon: BookOpen, to: '/verifier/ledger' },
]

const LEGAL_TOOLS = [
  { label: 'Tra cứu VNeID & Hộ tịch', icon: Search, to: '/verifier/vneid' },
  { label: 'Chứng thư số SmartCA', icon: KeyRound, to: '/verifier/smartca' },
  { label: 'Khóa niêm phong Shamir MPC', icon: Lock, to: '/verifier/shamir' },
]

function initialsFromEmail(email = '') {
  const name = email.split('@')[0].replace(/[^a-zA-Z]/g, '')
  return (name.slice(0, 2) || 'LV').toUpperCase()
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
          <SidebarSection title="CÔNG CỤ PHÁP LÝ" items={LEGAL_TOOLS} />
        </nav>

        <div className="d-flex flex-column gap-3 p-3" style={{ borderTop: '1px solid var(--av-slate-100)' }}>
          <div className="av-info-box" style={{ padding: 12 }}>
            <p className="d-flex align-items-center gap-2 mb-0 fs-12 fw-semibold text-brand">
              <ShieldCheck size={14} aria-hidden="true" />
              Cơ Quan Tư Pháp &amp; Công Chứng
            </p>
            <p className="mt-1 mb-0 fs-11 text-slate-500" style={{ lineHeight: 1.6 }}>
              Thẩm định hồ sơ nhân thân, kiểm tra trích lục và cấp dấu niêm phong số RFC 3161.
            </p>
          </div>

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
