import { ArrowRight, BadgeCheck, Clock, FileCheck2, PackageCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState, PageBanner, StatTile } from '../../components/beneficiary/BeneficiaryUi'
import CaseStatusBadge from '../../components/beneficiary/CaseStatusBadge'
import ReceiptCard from '../../components/beneficiary/ReceiptCard'
import { useBeneficiaryHandovers } from '../../hooks/useBeneficiary'
import { beneficiaryLoadErrorMessage, canConfirmReceipt } from '../../utils/beneficiary'

const assetNameOf = (item) => item.inheritance?.asset?.name ?? `Tài sản #${item.assetId}`

// Trang "Xác nhận & Biên nhận số": hồ sơ chờ xác nhận và các biên nhận đã cấp
// (GET /api/beneficiary/handovers + GET /api/beneficiary/handovers/{id}/receipt)
export default function BeneficiaryReceiptsPage() {
  const { status, error, items, reload } = useBeneficiaryHandovers({ withReceipts: true })

  if (status === 'loading') return <LoadingState message="Đang tải biên nhận..." />
  if (status === 'error') return <ErrorState message={beneficiaryLoadErrorMessage(error)} onRetry={reload} />

  const awaiting = items.filter((item) => canConfirmReceipt(item.status, item.receipt))
  const confirmed = items.filter((item) => item.receipt)
  const upcoming = items.filter((item) => !item.receipt && item.status !== 'Cancelled' && !canConfirmReceipt(item.status, item.receipt))

  return (
    <div className="d-flex flex-column gap-4">
      <PageBanner
        icon={FileCheck2}
        tag="DIGITAL RECEIPTS"
        title="Xác nhận & Biên nhận số"
        description="Xác nhận đã nhận tài sản sau khi người thi hành hoàn tất bàn giao và lưu giữ biên nhận số."
      />

      <div className="av-stat-grid">
        <StatTile label="CHỜ BẠN XÁC NHẬN" value={awaiting.length} unit="hồ sơ" icon={PackageCheck} tone="amber" />
        <StatTile label="BIÊN NHẬN ĐÃ CẤP" value={confirmed.length} unit="biên nhận" icon={BadgeCheck} tone="ok" />
        <StatTile label="CHƯA ĐẾN LƯỢT" value={upcoming.length} unit="hồ sơ" icon={Clock} tone="slate" />
        <StatTile label="TỔNG HỒ SƠ" value={items.length} unit="hồ sơ" icon={FileCheck2} />
      </div>

      <section className="av-panel d-flex flex-column gap-3" aria-label="Hồ sơ chờ xác nhận">
        <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
          Chờ bạn xác nhận
        </h2>
        {awaiting.length === 0 ? (
          <p className="av-empty mb-0">Không có hồ sơ nào đang chờ bạn xác nhận.</p>
        ) : (
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
            {awaiting.map((item) => (
              <li key={item.handoverId} className="av-doc-item av-awaiting-item">
                <span className="av-stat-icon is-amber">
                  <PackageCheck size={16} aria-hidden="true" />
                </span>
                <div className="av-doc-main">
                  <p className="mb-0 fs-13 fw-semibold text-ink text-truncate">{assetNameOf(item)}</p>
                  <p className="mb-0 fs-12 text-slate-500">{`Hồ sơ #${item.handoverId} · người thi hành đã hoàn tất bàn giao`}</p>
                </div>
                <Link to={`/beneficiary/status/${item.handoverId}`} className="av-btn av-btn-sm btn btn-primary text-decoration-none" id={`receipt-confirm-${item.handoverId}`}>
                  Xác nhận ngay
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="av-panel d-flex flex-column gap-3" aria-label="Biên nhận đã cấp">
        <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
          Biên nhận số đã cấp
        </h2>
        {confirmed.length === 0 ? (
          <p className="av-empty mb-0">Bạn chưa có biên nhận số nào.</p>
        ) : (
          <div className="av-receipt-grid">
            {confirmed.map((item) => (
              <ReceiptCard key={item.receipt.receiptId} receipt={item.receipt} assetName={assetNameOf(item)} />
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="av-panel d-flex flex-column gap-3" aria-label="Hồ sơ chưa đến bước xác nhận">
          <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
            Chưa đến bước xác nhận
          </h2>
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
            {upcoming.map((item) => (
              <li key={item.handoverId} className="av-doc-item">
                <div className="av-doc-main">
                  <p className="mb-0 fs-13 fw-semibold text-ink text-truncate">{assetNameOf(item)}</p>
                  <p className="mb-0 fs-12 text-slate-500">{`Hồ sơ #${item.handoverId}`}</p>
                </div>
                <CaseStatusBadge status={item.status} />
                <Link to={`/beneficiary/status/${item.handoverId}`} className="av-ghost-btn">
                  Theo dõi
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
