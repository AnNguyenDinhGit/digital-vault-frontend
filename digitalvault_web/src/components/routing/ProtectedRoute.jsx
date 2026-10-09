import { ShieldAlert } from 'lucide-react'
import { Button } from 'react-bootstrap'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// Bảo vệ route: chưa đăng nhập thì về trang chủ, sai vai trò thì báo không có quyền
export default function ProtectedRoute({ role }) {
  const { user, isChecking, hasRole, logout } = useAuth()
  const location = useLocation()

  if (isChecking) {
    return (
      <div className="av-center-screen">
        <p role="status" className="d-flex align-items-center gap-3 mb-0 fs-14 text-slate-500">
          <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
          Đang kiểm tra phiên đăng nhập...
        </p>
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />

  if (role && !hasRole(role)) {
    return (
      <div className="av-center-screen">
        <div className="av-denied-card">
          <span className="av-denied-icon">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>
          <h1 className="mt-3 mb-0 fw-bold text-ink" style={{ fontSize: 18 }}>Bạn không có quyền truy cập khu vực này</h1>
          <p className="mt-2 mb-0 fs-13 text-slate-500">Tài khoản hiện tại không có vai trò phù hợp.</p>
          <Button type="button" variant="primary" onClick={logout} className="av-btn av-btn-sm mt-4">
            Đăng xuất
          </Button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
