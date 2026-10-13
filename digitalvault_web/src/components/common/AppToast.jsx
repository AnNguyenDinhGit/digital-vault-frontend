import { CheckCircle2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

// Thông báo nổi góc phải dưới: tự ẩn sau autoHideMs, dừng đếm khi rê chuột vào để người dùng kịp đọc
export default function AppToast({ show, onClose, title, detail, autoHideMs = 5000 }) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!show || paused) return undefined
    const timer = setTimeout(onClose, autoHideMs)
    return () => clearTimeout(timer)
  }, [show, paused, autoHideMs, onClose])

  if (!show) return null
  return (
    <div className="av-toast-wrap">
      <div
        role="status"
        aria-live="polite"
        className="av-toast"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <span className="av-toast-icon">
          <CheckCircle2 size={18} aria-hidden="true" />
        </span>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <p className="mb-0 fw-bold text-ink fs-13">{title}</p>
          {detail && <p className="mb-0 fs-12 text-slate-500">{detail}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng thông báo" className="av-icon-btn">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
