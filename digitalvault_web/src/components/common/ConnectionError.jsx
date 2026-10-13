import { WifiOff } from 'lucide-react'

// Khung báo mất kết nối tới máy chủ, kèm nút thử lại đúng thao tác vừa thất bại
export default function ConnectionError({ title, message, onRetry, disabled = false }) {
  return (
    <div role="alert" className="av-conn-box">
      <div className="d-flex gap-2 align-items-start">
        <WifiOff size={18} aria-hidden="true" className="flex-shrink-0 mt-1" />
        <div>
          <p className="mb-1 fw-bold fs-13">{title}</p>
          <p className="mb-0 fs-12">{message}</p>
        </div>
      </div>
      <button type="button" onClick={onRetry} disabled={disabled} className="av-conn-retry">
        Thử kết nối lại ngay
      </button>
    </div>
  )
}
