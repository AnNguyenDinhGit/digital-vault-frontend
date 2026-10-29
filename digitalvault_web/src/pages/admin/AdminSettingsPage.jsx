import { SlidersHorizontal } from 'lucide-react'
import { useCallback, useState } from 'react'
import { getSystemConfig } from '../../callapi/adminApi'
import AdminResourceState from '../../components/admin/AdminResourceState'
import IntegrationsPanel from '../../components/admin/IntegrationsPanel'
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

// Trang "Cấu hình tham số" của Admin: tham số hệ thống và dịch vụ tích hợp bên thứ ba
export default function AdminSettingsPage({ mockMode = MOCK_MODE }) {
  const [tab, setTab] = useState('config')
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
            <p className="mb-0 fs-12 text-slate-500">Chính sách mã hóa, điểm danh, lưu trữ, sao lưu và kết nối tới dịch vụ bên thứ ba.</p>
          </div>
        </div>
        <div role="group" aria-label="Nhóm cấu hình" className="av-tabs">
          <button type="button" className="av-tab" aria-pressed={tab === 'config'} onClick={() => setTab('config')}>
            Cấu hình hệ thống
          </button>
          <button type="button" className="av-tab" aria-pressed={tab === 'integrations'} onClick={() => setTab('integrations')}>
            Tích hợp bên thứ ba
          </button>
        </div>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      {tab === 'config' ? <SystemConfigTab onSaved={() => setToast({ title: 'Đã lưu cấu hình hệ thống' })} /> : <IntegrationsPanel />}

      <AppToast show={Boolean(toast)} onClose={closeToast} title={toast?.title} />
    </div>
  )
}
