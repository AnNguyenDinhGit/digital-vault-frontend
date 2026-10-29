import { ArrowRight, FileText, FolderLock, Layers, Lock, Search, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackLink, ErrorState, LoadingState, PageBanner, StatTile } from '../../components/beneficiary/BeneficiaryUi'
import AssetTypeIcon from '../../components/owner/AssetTypeIcon'
import { useInheritedAssets } from '../../hooks/useBeneficiary'
import { assetStatusInfo, beneficiaryLoadErrorMessage } from '../../utils/beneficiary'
import { assetCode, assetTypeLabel, formatAllocation } from '../../utils/catalog'

const ALL = 'all'

function AssetTile({ inheritance }) {
  const { asset, allocation, handoverId } = inheritance
  const status = assetStatusInfo(asset.status)
  const documents = asset.documents ?? []
  const percent = Math.max(0, Math.min(100, Number(allocation) || 0))
  return (
    <article className="av-ben-asset" aria-labelledby={`ben-asset-${asset.assetId}`}>
      <div className="d-flex align-items-start gap-3">
        <span className="av-asset-icon">
          <AssetTypeIcon type={asset.type} />
        </span>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
            <span className="av-code-tag">{assetCode({ assetId: asset.assetId, type: asset.type || 'Other' })}</span>
            <span className={`av-badge av-badge-${status.tone}`}>{status.text}</span>
          </div>
          <h2 id={`ben-asset-${asset.assetId}`} className="mb-1 fw-bold text-ink fs-14 av-clamp-2">
            {asset.name}
          </h2>
          <p className="mb-0 fs-12 text-slate-500">{assetTypeLabel(asset.type)}</p>
        </div>
      </div>

      {asset.description && <p className="mb-0 fs-12 text-slate-600 av-clamp-2">{asset.description}</p>}

      <div>
        <div className="d-flex align-items-center justify-content-between fs-12 mb-1">
          <span className="text-slate-500">Tỷ lệ phân bổ cho bạn</span>
          <strong className="text-brand">{formatAllocation(percent)}</strong>
        </div>
        <div className="av-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Tỷ lệ phân bổ">
          <span className="av-progress-seg is-0" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="av-ben-asset-foot">
        <span className="d-inline-flex align-items-center gap-1 fs-12 text-slate-500">
          <FileText size={13} aria-hidden="true" />
          {`${documents.length} giấy tờ`}
          {documents.some((item) => item.isEncrypted) && <Lock size={11} className="ms-1 text-brand" aria-label="Có giấy tờ mã hóa" />}
        </span>
        {handoverId ? <span className="fs-12 text-slate-500">{`Hồ sơ #${handoverId}`}</span> : null}
        <Link to={`/beneficiary/assets/${asset.assetId}`} className="av-ghost-btn is-brand ms-auto" id={`ben-asset-detail-${asset.assetId}`}>
          Chi tiết
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}

// Trang "Tài sản thụ hưởng": danh sách tài sản được phân bổ cho người thụ hưởng (GET /api/beneficiary/assets)
export default function BeneficiaryAssetsPage() {
  const { status, error, items, reload } = useInheritedAssets()
  const [query, setQuery] = useState('')
  const [type, setType] = useState(ALL)

  const valid = useMemo(() => items.filter((item) => item?.asset), [items])
  const types = useMemo(() => [...new Set(valid.map((item) => item.asset.type).filter(Boolean))], [valid])
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi')
    return valid.filter((item) => {
      if (type !== ALL && item.asset.type !== type) return false
      if (!keyword) return true
      return [item.asset.name, item.asset.description].some((text) => (text ?? '').toLocaleLowerCase('vi').includes(keyword))
    })
  }, [valid, query, type])

  if (status === 'loading') return <LoadingState message="Đang tải tài sản thụ hưởng..." />
  if (status === 'error') {
    return (
      <div className="d-flex flex-column gap-3">
        <BackLink to="/beneficiary/status" label="Xem tiến trình bàn giao" />
        <ErrorState message={beneficiaryLoadErrorMessage(error)} onRetry={reload} />
      </div>
    )
  }

  const documentCount = valid.reduce((sum, item) => sum + (item.asset.documents?.length ?? 0), 0)
  const handoverCount = new Set(valid.map((item) => item.handoverId).filter(Boolean)).size

  return (
    <div className="d-flex flex-column gap-4">
      <PageBanner
        icon={FolderLock}
        tag="INHERITED ASSETS"
        title="Tài sản thụ hưởng"
        description="Các tài sản số đã được chủ sở hữu phân bổ cho bạn và đang trong quy trình bàn giao."
      />

      <div className="av-stat-grid">
        <StatTile label="TÀI SẢN ĐƯỢC NHẬN" value={valid.length} unit="tài sản" icon={Wallet} />
        <StatTile label="GIẤY TỜ ĐÍNH KÈM" value={documentCount} unit="tệp" icon={FileText} tone="info" />
        <StatTile label="HỒ SƠ BÀN GIAO" value={handoverCount} unit="hồ sơ" icon={Layers} tone="amber" />
        <StatTile label="LOẠI TÀI SẢN" value={types.length} unit="loại" icon={FolderLock} tone="ok" />
      </div>

      <section className="av-panel d-flex flex-column gap-3" aria-label="Danh sách tài sản thụ hưởng">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="av-search" style={{ flex: '1 1 260px', maxWidth: 420 }}>
            <Search size={16} className="av-field-icon" aria-hidden="true" />
            <input
              id="beneficiary-asset-search"
              type="search"
              className="form-control av-input av-input-icon av-input-sm"
              placeholder="Tìm theo tên hoặc mô tả tài sản..."
              aria-label="Tìm tài sản"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="av-tabs" role="group" aria-label="Lọc theo loại tài sản">
            <button type="button" className="av-tab" aria-pressed={type === ALL} onClick={() => setType(ALL)}>
              Tất cả
            </button>
            {types.map((item) => (
              <button key={item} type="button" className="av-tab" aria-pressed={type === item} onClick={() => setType(item)}>
                {assetTypeLabel(item)}
              </button>
            ))}
          </div>
        </div>

        {valid.length === 0 ? (
          <div className="av-empty">
            <FolderLock size={32} className="text-slate-400 mb-2" aria-hidden="true" />
            <p className="mb-1 fw-semibold text-ink">Chưa có tài sản nào được bàn giao cho bạn.</p>
            <p className="mb-0">Tài sản sẽ xuất hiện khi người thi hành khởi tạo hồ sơ bàn giao di sản.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="av-empty mb-0">Không có tài sản nào khớp với bộ lọc.</p>
        ) : (
          <div className="av-ben-asset-grid">
            {filtered.map((item) => (
              <AssetTile key={`${item.handoverId}-${item.asset.assetId}`} inheritance={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
