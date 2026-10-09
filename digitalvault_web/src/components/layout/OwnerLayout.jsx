import { Activity, FolderLock, History, LogOut, Settings, ShieldCheck, UserCog, Users } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import BrandLogo from '../common/BrandLogo'

const COMING_SOON = 'Sắp ra mắt'

const VAULT_ITEMS = [
  { label: 'Danh mục tài sản số', icon: FolderLock, to: '/owner/assets' },
  { label: 'Người thụ hưởng', icon: Users, to: '/owner/beneficiaries' },
  { label: 'Người thi hành (Executor)', icon: UserCog },
]

const MONITOR_ITEMS = [
  { label: 'Điểm danh sự sống', icon: Activity },
  { label: 'Nhật ký hoạt động', icon: History },
  { label: 'Cài đặt bảo mật', icon: Settings },
]

const itemClass = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors'

// Lấy 2 ký tự viết tắt từ phần tên của email để làm avatar
function initialsFromEmail(email = '') {
  const name = email.split('@')[0].replace(/[^a-zA-Z]/g, '')
  return (name.slice(0, 2) || 'VO').toUpperCase()
}

function SidebarItem({ label, icon: Icon, to }) {
  if (!to) {
    // Chức năng BE chưa có API: hiển thị theo thiết kế nhưng vô hiệu hoá
    return (
      <button type="button" disabled title={COMING_SOON} className={`${itemClass} cursor-not-allowed text-slate-400`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 font-mono text-[8px] font-semibold text-slate-400">
          {COMING_SOON}
        </span>
      </button>
    )
  }
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${itemClass} ${isActive ? 'bg-primary-tint text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'}`
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </NavLink>
  )
}

function SidebarSection({ title, items }) {
  return (
    <div>
      <p className="px-3 font-mono text-[10px] font-semibold tracking-[0.12em] text-slate-400">{title}</p>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <SidebarItem key={item.label} {...item} />
        ))}
      </div>
    </div>
  )
}

// Khung giao diện khu vực Vault Owner: sidebar trái + nội dung bên phải
export default function OwnerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-page">
      <aside className="sticky top-0 flex h-screen w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-[72px] items-center border-b border-slate-100 px-5">
          <BrandLogo subtitle="VAULT OWNER PORTAL" />
        </div>

        <nav aria-label="Điều hướng Vault Owner" className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          <SidebarSection title="KHO TÀI SẢN SỐ" items={VAULT_ITEMS} />
          <SidebarSection title="GIÁM SÁT & BẢO MẬT" items={MONITOR_ITEMS} />
        </nav>

        <div className="space-y-3 border-t border-slate-100 p-4">
          <div className="rounded-xl border border-primary/15 bg-primary-tint/70 p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Bảo Chứng Số Hiệu &amp; E2EE
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Dữ liệu tài sản được mã hóa AES-256-GCM trước khi lưu trữ.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-white">
              {initialsFromEmail(user?.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-ink">{user?.email}</p>
              <p className="font-mono text-[10px] text-slate-400">VAULT OWNER</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
