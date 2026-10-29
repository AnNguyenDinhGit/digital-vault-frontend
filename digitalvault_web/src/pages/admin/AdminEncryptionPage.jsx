import { RefreshCw, RotateCw, ShieldCheck } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from 'react-bootstrap'
import { getKeyRotation } from '../../callapi/adminApi'
import AdminResourceState from '../../components/admin/AdminResourceState'
import RotateKeysModal from '../../components/admin/RotateKeysModal'
import AppToast from '../../components/common/AppToast'
import MockNotice from '../../components/common/MockNotice'
import { useAdminResource } from '../../hooks/useAdminResource'
import { MOCK_MODE } from '../../mocks/mode'
import { formatDateTime } from '../../utils/proofOfLife'

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

// Trang "Giám sát mã hóa & khóa" của Admin: thống kê khóa mã hóa từng tài sản và xoay vòng khóa
export default function AdminEncryptionPage({ mockMode = MOCK_MODE }) {
  const { data, error, loading, reload, apply } = useAdminResource(getKeyRotation)
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const handleRotated = (summary) => {
    apply(summary)
    setConfirming(false)
    setToast({ title: 'Đã xoay vòng khóa mã hóa', detail: `${summary.activeKeys} khóa đang hoạt động đã được tăng phiên bản.` })
  }

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Giám sát mã hóa &amp; khóa
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Khóa mã hóa AES của từng tài sản và việc xoay vòng khóa định kỳ.</p>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button type="button" variant="light" className="av-btn av-btn-sm border" disabled={loading} onClick={reload}>
            <RefreshCw size={16} aria-hidden="true" />
            Làm mới
          </Button>
          <Button type="button" variant="primary" className="av-btn av-btn-sm" disabled={!data || data.activeKeys === 0} onClick={() => setConfirming(true)}>
            <RotateCw size={16} aria-hidden="true" />
            Xoay vòng khóa
          </Button>
        </div>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      <AdminResourceState error={error} loading={loading} hasData={Boolean(data)} loadingText="Đang tải thống kê khóa mã hóa..." onRetry={reload} />

      {data && (
        <>
          <div className="av-stat-grid">
            <StatTile label="Tổng số khóa" value={data.totalKeys} />
            <StatTile label="Khóa đang hoạt động" value={data.activeKeys} />
            <StatTile label="Khóa đã xoay" value={data.rotatedKeys} />
            <StatTile label="Khóa cần xoay" value={data.keysNeedingRotation} hint={`Quá chu kỳ ${data.rotationIntervalDays} ngày`} />
          </div>

          <section className="av-panel d-flex flex-column gap-3" aria-labelledby="keys-title">
            <div>
              <h2 id="keys-title" className="mb-1 fw-bold text-ink" style={{ fontSize: 17 }}>
                Khóa mã hóa theo tài sản
              </h2>
              <p className="mb-0 fs-12 text-slate-500">
                {`Chu kỳ xoay khóa: ${data.rotationIntervalDays} ngày · Lần xoay gần nhất: ${data.lastRotatedAt ? formatDateTime(data.lastRotatedAt) : 'Chưa từng xoay khóa'}`}
              </p>
            </div>
            {data.keys.length === 0 ? (
              <p className="av-empty mb-0">Chưa có khóa mã hóa nào.</p>
            ) : (
              <div className="table-responsive" aria-busy={loading}>
                <table className="table align-middle mb-0 fs-13" aria-label="Danh sách khóa mã hóa">
                  <thead>
                    <tr className="fs-11 text-slate-500">
                      <th scope="col">Tài sản</th>
                      <th scope="col">Thuật toán</th>
                      <th scope="col">Phiên bản</th>
                      <th scope="col">Ngày tạo</th>
                      <th scope="col">Lần xoay gần nhất</th>
                      <th scope="col">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.keys.map((key) => (
                      <tr key={key.keyId}>
                        <td className="fw-semibold text-ink">{key.assetName ?? `Tài sản #${key.assetId}`}</td>
                        <td className="font-mono fs-12">{key.algorithm}</td>
                        <td>{`v${key.keyVersion}`}</td>
                        <td className="text-nowrap">{formatDateTime(key.createdAt)}</td>
                        <td className="text-nowrap">{key.rotatedAt ? formatDateTime(key.rotatedAt) : '—'}</td>
                        <td>
                          <span className={`av-badge ${key.needsRotation ? 'av-badge-caution' : key.status === 'Active' ? 'av-badge-ok' : 'av-badge-muted'}`}>
                            {key.needsRotation ? 'Cần xoay' : key.status === 'Active' ? 'Đang hoạt động' : key.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {confirming && data && <RotateKeysModal activeKeys={data.activeKeys} onClose={() => setConfirming(false)} onRotated={handleRotated} />}
      <AppToast show={Boolean(toast)} onClose={closeToast} title={toast?.title} detail={toast?.detail} />
    </div>
  )
}
