import { Paperclip } from 'lucide-react'
import { Link } from 'react-router-dom'
import { assetCode, assetTypeLabel, formatAllocation } from '../../utils/catalog'
import AssetTypeIcon from './AssetTypeIcon'

const COMING_SOON = 'Sắp ra mắt'

// Thẻ một tài sản trong danh sách: thông tin, người thụ hưởng, file đính kèm và hành động
export default function AssetCard({ asset }) {
  const titleId = `asset-title-${asset.assetId}`
  const [firstDocument] = asset.documents
  const extraDocuments = asset.documents.length - 1

  return (
    <article aria-labelledby={titleId} className="av-asset-card">
      <div className="d-flex gap-3" style={{ minWidth: 0, flex: '1 1 420px' }}>
        <span className="av-asset-icon">
          <AssetTypeIcon type={asset.type} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="av-code-tag">{assetCode(asset)}</span>
            <span className="av-badge av-badge-muted">{assetTypeLabel(asset.type)}</span>
            {firstDocument ? (
              <span className="av-badge av-badge-info">{`Đã đính kèm ${asset.documents.length} file`}</span>
            ) : (
              <span className="av-badge av-badge-warn">Chưa có giấy tờ</span>
            )}
          </div>
          <h3 id={titleId} className="mt-2 mb-0 fw-bold text-ink" style={{ fontSize: 15 }}>
            {asset.name}
          </h3>
          {asset.description && (
            <p className="mt-1 mb-0 fs-12 text-slate-500" style={{ lineHeight: 1.6 }}>
              {asset.description}
            </p>
          )}
          <p className="mt-2 mb-0 fs-12 text-slate-500">
            Người thụ hưởng:{' '}
            {asset.beneficiaries.length === 0 ? (
              <span className="fw-semibold" style={{ color: '#d97706' }}>
                Chưa phân quyền
              </span>
            ) : (
              <span className="fw-semibold text-ink">
                {asset.beneficiaries.map((b) => `${b.fullName} (${formatAllocation(b.allocation)})`).join(', ')}
              </span>
            )}
          </p>
          <p className="mt-1 mb-0 fs-12 text-slate-500 d-flex align-items-center gap-1">
            <Paperclip size={12} aria-hidden="true" />
            {firstDocument
              ? `File đính kèm: ${firstDocument.fileName}${extraDocuments > 0 ? ` (+${extraDocuments})` : ''}`
              : 'Chưa có giấy tờ đính kèm'}
          </p>
        </div>
      </div>

      <div className="d-flex gap-2">
        <Link to={`/owner/assets/${asset.assetId}`} className="av-ghost-btn">
          Xem chi tiết
        </Link>
        <button type="button" disabled title={COMING_SOON} className="av-ghost-btn is-brand">
          Chỉnh sửa
        </button>
      </div>
    </article>
  )
}
