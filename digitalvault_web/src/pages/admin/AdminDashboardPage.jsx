import { LayoutDashboard, RefreshCw } from 'lucide-react'
import { Button } from 'react-bootstrap'
import { getSecurityAlerts } from '../../callapi/adminApi'
import AdminResourceState from '../../components/admin/AdminResourceState'
import MockNotice from '../../components/common/MockNotice'
import { useAdminResource } from '../../hooks/useAdminResource'
import { MOCK_MODE } from '../../mocks/mode'
import { severityInfo } from '../../utils/admin'
import { actionLabel } from '../../utils/activityLog'
import { formatDateTime } from '../../utils/proofOfLife'

const BADGE_CLASS = { ok: 'av-badge-ok', warn: 'av-badge-warn', caution: 'av-badge-caution', info: 'av-badge-info', muted: 'av-badge-muted' }

function StatTile({ label, value, hint }) {
  return (
    <div role="group" aria-label={label} className="av-stat">
      <div>
        <p className="av-stat-label">{label.toUpperCase()}</p>
        <p className="mb-0 mt-1">
          <span className="av-stat-value">{value}</span>
        </p>
        {hint && <p className="mb-0 mt-1 fs-11 text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}

// Trang "Tổng quan hệ thống" của Admin: cảnh báo an ninh tự động từ nhật ký 24 giờ qua
export default function AdminDashboardPage({ mockMode = MOCK_MODE }) {
  const { data, error, loading, reload } = useAdminResource(getSecurityAlerts)

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <LayoutDashboard size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Tổng quan hệ thống
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Cảnh báo an ninh tự động từ nhật ký hoạt động trong 24 giờ qua.</p>
          </div>
        </div>
        <Button type="button" variant="light" className="av-btn av-btn-sm border" disabled={loading} onClick={reload}>
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </Button>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      <AdminResourceState error={error} loading={loading} hasData={Boolean(data)} loadingText="Đang tải cảnh báo an ninh..." onRetry={reload} />

      {data && (
        <>
          <div className="av-stat-grid">
            <StatTile label="Thao tác trong 24 giờ" value={data.totalAuditLogs24h} hint="Tổng số bản ghi nhật ký" />
            <StatTile label="Thao tác thất bại" value={data.failedActions24h} hint="Không thành công trong 24 giờ" />
            <StatTile label="Tỷ lệ thất bại" value={`${data.failureRatePercentage}%`} hint="Trên tổng số thao tác" />
            <StatTile label="Cảnh báo đang hoạt động" value={data.activeAlertsCount} hint="Chưa tính thông báo thông tin" />
          </div>

          <section className="av-panel d-flex flex-column gap-3" aria-labelledby="alerts-title">
            <h2 id="alerts-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 17 }}>
              Cảnh báo an ninh
            </h2>
            {data.recentAlerts.length === 0 ? (
              <p className="av-empty mb-0">Không có cảnh báo nào trong 24 giờ qua.</p>
            ) : (
              <ul className="list-unstyled mb-0 d-flex flex-column gap-2" aria-label="Danh sách cảnh báo">
                {data.recentAlerts.map((alert) => {
                  const severity = severityInfo(alert.severity)
                  return (
                    <li key={alert.alertId} className="av-owner-notice-row">
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <span className={`av-badge ${BADGE_CLASS[severity.tone]}`}>{severity.text}</span>
                          <p className="mb-0 fw-semibold text-ink fs-13">{alert.title}</p>
                        </div>
                        <p className="mb-1 mt-1 fs-13 text-slate-600">{alert.description}</p>
                        <p className="mb-0 fs-11 text-slate-400">
                          {[alert.targetUserEmail, alert.ipAddress && `IP ${alert.ipAddress}`, formatDateTime(alert.detectedAt)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {data.topFailedActions.length > 0 && (
            <section className="av-panel d-flex flex-column gap-3" aria-labelledby="top-failed-title">
              <h2 id="top-failed-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 17 }}>
                Thao tác thất bại nhiều nhất
              </h2>
              <ul className="list-unstyled mb-0 d-flex flex-column gap-2" aria-label="Thao tác thất bại nhiều nhất">
                {data.topFailedActions.map((item) => (
                  <li key={item.key} className="d-flex align-items-center justify-content-between fs-13">
                    <span className="text-ink">{actionLabel(item.key)}</span>
                    <span className="av-badge av-badge-muted">{item.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
