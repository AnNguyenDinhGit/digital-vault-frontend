import { ArrowLeft } from 'lucide-react'
import { Alert, Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'

// Dòng "đang tải" dùng chung cho các trang Người thụ hưởng
export function LoadingState({ message }) {
  return (
    <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500">
      <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
      {message}
    </p>
  )
}

// Hộp báo lỗi kèm nút thử lại
export function ErrorState({ message, onRetry }) {
  return (
    <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3">
      <span>{message}</span>
      {onRetry && (
        <Button type="button" variant="light" size="sm" className="border" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </Alert>
  )
}

export function BackLink({ to, label }) {
  return (
    <Link to={to} className="d-inline-flex align-items-center gap-2 fs-13 fw-medium text-slate-600 text-decoration-none av-back-link">
      <ArrowLeft size={16} aria-hidden="true" />
      {label}
    </Link>
  )
}

// Banner đầu trang: icon, tiêu đề (h1 duy nhất của trang) và mô tả
export function PageBanner({ icon: Icon, tag, title, description, children }) {
  return (
    <section className="av-panel av-ben-hero">
      <div className="d-flex align-items-center gap-3">
        <span className="av-icon-tile">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div>
          {tag && <p className="mb-1 av-mono-tag fs-10">{tag}</p>}
          <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {description && <p className="mb-0 fs-12 text-slate-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

// Ô thống kê nhỏ
export function StatTile({ label, value, unit, icon: Icon, tone = 'brand' }) {
  return (
    <div className="av-stat">
      <div>
        <p className="av-stat-label">{label}</p>
        <p className="mb-0 mt-2 text-ink">
          <span className="av-stat-value">{value}</span>
          {unit && <span className="av-stat-unit">{unit}</span>}
        </p>
      </div>
      <span className={`av-stat-icon is-${tone}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
    </div>
  )
}
