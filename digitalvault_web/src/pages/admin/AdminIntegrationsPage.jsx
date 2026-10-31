import { Plug } from 'lucide-react'
import IntegrationsPanel from '../../components/admin/IntegrationsPanel'

// Trang "Trạng thái tích hợp dịch vụ" của Admin: kết nối tới các dịch vụ bên thứ ba (eKYC, chữ ký số, công chứng, lưu trữ, email)
// và nút kiểm tra kết nối thời gian thực cho từng dịch vụ
export default function AdminIntegrationsPage() {
  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <Plug size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Trạng thái tích hợp dịch vụ
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Theo dõi kết nối tới các dịch vụ bên thứ ba mà hệ thống sử dụng và kiểm tra lại khi cần.</p>
          </div>
        </div>
      </section>

      <IntegrationsPanel />
    </div>
  )
}
