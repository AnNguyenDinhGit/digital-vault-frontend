import { SlidersHorizontal } from 'lucide-react'
import { useCallback, useState } from 'react'
import { getSystemConfig } from '../../callapi/adminApi'
import AdminResourceState from '../../components/admin/AdminResourceState'
import SystemConfigForm from '../../components/admin/SystemConfigForm'
import AppToast from '../../components/common/AppToast'
import MockNotice from '../../components/common/MockNotice'
import { useAdminResource } from '../../hooks/useAdminResource'
import { MOCK_MODE } from '../../mocks/mode'

// Tab "Cấu hình hệ thống": tải cấu hình hiện tại rồi hiện form; key theo thời điểm cập nhật để form nạp lại giá trị mới sau khi lưu
function SystemConfigTab({ onSaved }) {
  const { data, error, loading, reload, apply } = useAdminResource(getSystemConfig)
  return (
    <>
      <AdminResourceState error={error} loading={loading} hasData={Boolean(data)} loadingText="Đang tải cấu hình hệ thống..." onRetry={reload} />
      {data && (
        <SystemConfigForm
          key={data.lastUpdatedAt}
          config={data}
          onSaved={(config) => {
            apply(config)
            onSaved()
          }}
        />
      )}
    </>
  )
}

// Trang "Cấu hình tham số" của Admin: chính sách mã hóa, điểm danh, lưu trữ và sao lưu (trạng thái dịch vụ tích hợp ở trang riêng)
export default function AdminSettingsPage({ mockMode = MOCK_MODE }) {
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <SlidersHorizontal size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Cấu hình tham số hệ thống
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Chính sách mã hóa, điểm danh, lưu trữ và sao lưu của hệ thống.</p>
          </div>
        </div>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      <SystemConfigTab onSaved={() => setToast({ title: 'Đã lưu cấu hình hệ thống' })} />

      <AppToast show={Boolean(toast)} onClose={closeToast} title={toast?.title} />
    </div>
  )
}
