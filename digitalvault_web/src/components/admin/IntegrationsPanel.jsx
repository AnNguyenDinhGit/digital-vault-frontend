import { Plug, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { getIntegrations, pingIntegration } from '../../callapi/adminApi'
import { useAdminResource } from '../../hooks/useAdminResource'
import { integrationStatusInfo } from '../../utils/admin'
import { formatDateTime } from '../../utils/proofOfLife'
import AdminResourceState from './AdminResourceState'

const BADGE_CLASS = { ok: 'av-badge-ok', warn: 'av-badge-warn', caution: 'av-badge-caution', info: 'av-badge-info', muted: 'av-badge-muted' }

function pingErrorMessage(error) {
  if (error?.status === 404) return 'Không tìm thấy dịch vụ tích hợp này.'
  if (error?.status === 403) return 'Bạn không có quyền Quản trị hệ thống.'
  return error?.message || 'Không kiểm tra được kết nối, vui lòng thử lại.'
}

// Danh sách dịch vụ bên thứ ba (eKYC, chữ ký số, công chứng, lưu trữ, email) và nút kiểm tra kết nối thời gian thực
export default function IntegrationsPanel() {
  const { data: services, error, loading, reload } = useAdminResource(getIntegrations)
  // Kết quả kiểm tra theo từng dịch vụ: { state: 'pinging' | 'done' | 'error', result?, message? }
  const [checks, setChecks] = useState({})

  const setCheck = (serviceId, value) => setChecks((prev) => ({ ...prev, [serviceId]: value }))

  const handlePing = async (serviceId) => {
    setCheck(serviceId, { state: 'pinging' })
    try {
      setCheck(serviceId, { state: 'done', result: await pingIntegration(serviceId) })
    } catch (caught) {
      setCheck(serviceId, { state: 'error', message: pingErrorMessage(caught) })
    }
  }

  return (
    <section className="av-panel d-flex flex-column gap-3" aria-label="Tích hợp bên thứ ba">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h2 className="mb-1 fw-bold text-ink" style={{ fontSize: 17 }}>
            Dịch vụ tích hợp
          </h2>
          <p className="mb-0 fs-12 text-slate-500">Trạng thái kết nối tới các dịch vụ bên thứ ba mà hệ thống sử dụng.</p>
        </div>
        <Button type="button" variant="light" className="av-btn av-btn-sm border" disabled={loading} onClick={reload}>
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </Button>
      </div>

      <AdminResourceState error={error} loading={loading} hasData={Boolean(services)} loadingText="Đang tải danh sách dịch vụ tích hợp..." onRetry={reload} />

      {services && (
        <ul className="list-unstyled mb-0 d-flex flex-column gap-3" aria-label="Danh sách dịch vụ tích hợp">
          {services.map((service) => {
            const status = integrationStatusInfo(service.status)
            const check = checks[service.serviceId]
            return (
              <li key={service.serviceId} aria-label={service.serviceName} className="av-owner-notice-row flex-column align-items-stretch gap-2">
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                  <div style={{ minWidth: 0 }}>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <Plug size={14} aria-hidden="true" className="text-slate-400" />
                      <p className="mb-0 fw-semibold text-ink fs-14">{service.serviceName}</p>
                      <span className={`av-badge ${BADGE_CLASS[status.tone]}`}>{status.text}</span>
                    </div>
                    <p className="mb-0 mt-1 fs-12 text-slate-500">{`${service.provider} · ${service.serviceType}`}</p>
                    <p className="mb-0 font-mono fs-11 text-slate-400 text-break">{service.endpointUrl}</p>
                    <p className="mb-0 fs-11 text-slate-400">{`Độ trễ gần nhất: ${service.latencyMs} ms · Kiểm tra lúc ${formatDateTime(service.lastCheckedAt)}`}</p>
                    {service.errorMessage && <p className="mb-0 fs-12 text-danger">{service.errorMessage}</p>}
                  </div>
                  <Button type="button" variant="light" size="sm" className="border" disabled={check?.state === 'pinging'} onClick={() => handlePing(service.serviceId)}>
                    {check?.state === 'pinging' ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                  </Button>
                </div>
                {check?.state === 'done' && check.result.success && (
                  <p className="mb-0 fs-12 text-brand">{`${check.result.message} Độ trễ ${check.result.latencyMs} ms (${formatDateTime(check.result.testedAt)}).`}</p>
                )}
                {check?.state === 'done' && !check.result.success && (
                  <Alert variant="danger" className="av-alert mb-0">{check.result.message}</Alert>
                )}
                {check?.state === 'error' && <Alert variant="danger" className="av-alert mb-0">{check.message}</Alert>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
