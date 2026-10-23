import { Activity, ArrowRight, CheckCircle2, Clock, PackageCheck, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState, PageBanner, StatTile } from '../../components/beneficiary/BeneficiaryUi'
import CaseStatusBadge from '../../components/beneficiary/CaseStatusBadge'
import HandoverStepper from '../../components/beneficiary/HandoverStepper'
import AssetTypeIcon from '../../components/owner/AssetTypeIcon'
import { useBeneficiaryHandovers } from '../../hooks/useBeneficiary'
import { beneficiaryLoadErrorMessage, caseStatusInfo } from '../../utils/beneficiary'
import { formatAllocation } from '../../utils/catalog'

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Pending', label: 'Chờ bàn giao' },
  { key: 'In_Progress', label: 'Đang chuyển giao' },
  { key: 'Completed', label: 'Chờ bạn xác nhận' },
  { key: 'Received', label: 'Đã nhận' },
]

// Trang "Tiến trình bàn giao": các hồ sơ bàn giao của người thụ hưởng (GET /api/beneficiary/handovers)
export default function BeneficiaryHandoversPage() {
  const { status, error, items, reload } = useBeneficiaryHandovers()
  const [filter, setFilter] = useState('all')

  const counts = useMemo(
    () => items.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] ?? 0) + 1 }), {}),
    [items],
  )
  const visible = filter === 'all' ? items : items.filter((item) => item.status === filter)

  if (status === 'loading') return <LoadingState message="Đang tải tiến trình bàn giao..." />
  if (status === 'error') return <ErrorState message={beneficiaryLoadErrorMessage(error)} onRetry={reload} />

  return (
    <div className="d-flex flex-column gap-4">
      <PageBanner
        icon={Activity}
        tag="HANDOVER TRACKING"
        title="Tiến trình bàn giao"
        description="Theo dõi từng bước bàn giao tài sản di sản từ người thi hành tới bạn."
      />

      <div className="av-stat-grid">
        <StatTile label="CHỜ BÀN GIAO" value={counts.Pending ?? 0} unit="hồ sơ" icon={Clock} tone="slate" />
        <StatTile label="ĐANG CHUYỂN GIAO" value={counts.In_Progress ?? 0} unit="hồ sơ" icon={Truck} tone="info" />
        <StatTile label="CHỜ BẠN XÁC NHẬN" value={counts.Completed ?? 0} unit="hồ sơ" icon={PackageCheck} tone="amber" />
        <StatTile label="ĐÃ NHẬN" value={counts.Received ?? 0} unit="hồ sơ" icon={CheckCircle2} tone="ok" />
      </div>

      {(counts.Completed ?? 0) > 0 && (
        <p className="av-notice d-flex flex-wrap align-items-center justify-content-between gap-2 mb-0">
          <span>
            <strong>{`Có ${counts.Completed} hồ sơ đã bàn giao xong`}</strong> — vui lòng kiểm tra và xác nhận để nhận biên nhận số.
          </span>
          <Link to="/beneficiary/receipts" className="av-link-btn fs-13 text-decoration-none">
            Đi tới xác nhận
          </Link>
        </p>
      )}

      <section className="av-panel d-flex flex-column gap-3" aria-label="Hồ sơ bàn giao">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
            Hồ sơ bàn giao của bạn
          </h2>
          <div className="av-tabs" role="group" aria-label="Lọc theo trạng thái">
            {FILTERS.map((item) => (
              <button key={item.key} type="button" className="av-tab" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>
                {item.label}
                {item.key !== 'all' && counts[item.key] ? ` (${counts[item.key]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="av-empty">
            <Activity size={32} className="text-slate-400 mb-2" aria-hidden="true" />
            <p className="mb-1 fw-semibold text-ink">Chưa có hồ sơ bàn giao nào.</p>
            <p className="mb-0">Hồ sơ sẽ xuất hiện khi người thi hành bắt đầu quy trình bàn giao di sản cho bạn.</p>
          </div>
        ) : visible.length === 0 ? (
          <p className="av-empty mb-0">{`Không có hồ sơ ở trạng thái "${caseStatusInfo(filter).text}".`}</p>
        ) : (
          <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
            {visible.map((item) => {
              const asset = item.inheritance?.asset
              return (
                <li key={item.handoverId} className="av-ben-case">
                  <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                    <div className="d-flex align-items-start gap-3" style={{ minWidth: 0 }}>
                      <span className="av-asset-icon">
                        <AssetTypeIcon type={asset?.type} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <span className="av-code-tag">{`HỒ SƠ #${item.handoverId}`}</span>
                          <CaseStatusBadge status={item.status} />
                        </div>
                        <p className="mb-0 fs-14 fw-bold text-ink av-clamp-2">{asset?.name ?? `Tài sản #${item.assetId}`}</p>
                        {item.inheritance && (
                          <p className="mb-0 fs-12 text-slate-500">{`Phân bổ cho bạn: ${formatAllocation(item.inheritance.allocation)}`}</p>
                        )}
                      </div>
                    </div>
                    <Link to={`/beneficiary/status/${item.handoverId}`} className="av-ghost-btn is-brand" id={`handover-detail-${item.handoverId}`}>
                      {item.status === 'Completed' ? 'Xác nhận nhận tài sản' : 'Xem tiến trình'}
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                  <HandoverStepper status={item.status} compact />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
