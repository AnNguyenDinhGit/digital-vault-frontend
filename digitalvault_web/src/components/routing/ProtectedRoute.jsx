import { ShieldAlert } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// Bảo vệ route: chưa đăng nhập thì về trang chủ, sai vai trò thì báo không có quyền
export default function ProtectedRoute({ role }) {
  const { user, isChecking, hasRole, logout } = useAuth()
  const location = useLocation()

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <p role="status" className="flex items-center gap-3 text-[14px] text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Đang kiểm tra phiên đăng nhập...
        </p>
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />

  if (role && !hasRole(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-[18px] font-bold text-ink">Bạn không có quyền truy cập khu vực này</h1>
          <p className="mt-2 text-[13px] text-slate-500">Tài khoản hiện tại không có vai trò phù hợp.</p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 h-10 rounded-lg bg-primary px-5 text-[13px] font-semibold text-white hover:bg-primary-hover"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
