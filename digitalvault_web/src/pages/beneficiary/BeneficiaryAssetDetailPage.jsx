import { ArrowRight, FileText, Info, PieChart } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { downloadInheritedAssetDocument } from '../../callapi/beneficiaryApi'
import AppToast from '../../components/common/AppToast'
import { BackLink, ErrorState, LoadingState } from '../../components/beneficiary/BeneficiaryUi'
import DocumentList from '../../components/beneficiary/DocumentList'
import AssetTypeIcon from '../../components/owner/AssetTypeIcon'
import { useInheritedAsset } from '../../hooks/useBeneficiary'
import { assetStatusInfo, beneficiaryLoadErrorMessage } from '../../utils/beneficiary'
import { assetCode, assetTypeLabel, formatAllocation } from '../../utils/catalog'

const BACK = { to: '/beneficiary/assets', label: 'Quay lại tài sản thụ hưởng' }

// Trang chi tiết một tài sản thụ hưởng (GET /api/beneficiary/assets/{assetId}) và tải giấy tờ đính kèm
export default function BeneficiaryAssetDetailPage() {
  const { assetId } = useParams()
  const { status, error, inheritance, reload } = useInheritedAsset(assetId)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  if (status === 'loading') return <LoadingState message="Đang tải chi tiết tài sản..." />
  if (status === 'error' || !inheritance?.asset) {
    return (
      <div className="d-flex flex-column gap-3">
        <BackLink {...BACK} />
        <ErrorState message={beneficiaryLoadErrorMessage(error, 'Không tìm thấy tài sản thụ hưởng.')} onRetry={error?.status === 404 ? undefined : reload} />
      </div>
    )
  }

  const { asset, allocation, handoverId } = inheritance
  const assetStatus = assetStatusInfo(asset.status)
  const percent = Math.max(0, Math.min(100, Number(allocation) || 0))
  const documents = asset.documents ?? []

  return (
    <div className="d-flex flex-column gap-4">
      <BackLink {...BACK} />

      <section className="av-panel av-ben-hero">
        <div className="d-flex align-items-start gap-3" style={{ minWidth: 0 }}>
          <span className="av-icon-tile">
            <AssetTypeIcon type={asset.type} size={22} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span className="av-code-tag">{assetCode({ assetId: asset.assetId, type: asset.type || 'Other' })}</span>
              <span className={`av-badge av-badge-${assetStatus.tone}`}>{assetStatus.text}</span>
              <span className="av-badge av-badge-muted">{assetTypeLabel(asset.type)}</span>
            </div>
            <h1 className="mb-0 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              {asset.name}
            </h1>
          </div>
        </div>
        <div className="av-allocation-ring" style={{ '--av-pct': percent }} role="img" aria-label={`Bạn được phân bổ ${formatAllocation(percent)}`}>
          <span>
            <strong>{formatAllocation(percent)}</strong>
            <small>phân bổ</small>
          </span>
        </div>
      </section>

      <div className="row g-4">
        <section className="col-12 col-xl-7">
          <div className="av-panel d-flex flex-column gap-3 h-100">
            <h2 className="mb-0 fw-bold text-ink d-flex align-items-center gap-2" style={{ fontSize: 16 }}>
              <Info size={16} aria-hidden="true" />
              Thông tin tài sản
            </h2>
            <p className="mb-0 fs-13 text-slate-600" style={{ lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {asset.description || 'Chủ sở hữu không để lại mô tả cho tài sản này.'}
            </p>
            <dl className="av-meta-grid mb-0">
              <div>
                <dt>Mã tài sản</dt>
                <dd className="font-mono">{`#${asset.assetId}`}</dd>
              </div>
              <div>
                <dt>Loại tài sản</dt>
                <dd>{assetTypeLabel(asset.type) || '—'}</dd>
              </div>
              <div>
                <dt>Tỷ lệ phân bổ</dt>
                <dd className="text-brand fw-bold">{formatAllocation(percent)}</dd>
              </div>
              <div>
                <dt>Hồ sơ bàn giao</dt>
                <dd>{handoverId ? `#${handoverId}` : 'Chưa có'}</dd>
              </div>
            </dl>
            <div>
              <div className="d-flex align-items-center justify-content-between fs-12 mb-1">
                <span className="text-slate-500 d-inline-flex align-items-center gap-1">
                  <PieChart size={13} aria-hidden="true" />
                  Phần của bạn trong tài sản
                </span>
                <strong className="text-brand">{formatAllocation(percent)}</strong>
              </div>
              <div className="av-progress">
                <span className="av-progress-seg is-0" style={{ width: `${percent}%` }} />
              </div>
            </div>
            {handoverId ? (
              <Link to={`/beneficiary/status/${handoverId}`} className="av-ghost-btn is-brand align-self-start" id="asset-view-handover">
                Xem tiến trình bàn giao
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </section>

        <section className="col-12 col-xl-5">
          <div className="av-panel d-flex flex-column gap-3 h-100">
            <h2 className="mb-0 fw-bold text-ink d-flex align-items-center gap-2" style={{ fontSize: 16 }}>
              <FileText size={16} aria-hidden="true" />
              Giấy tờ đính kèm
            </h2>
            <DocumentList
              documents={documents}
              label="Giấy tờ của tài sản"
              emptyMessage="Tài sản chưa có giấy tờ đính kèm."
              download={(document) => downloadInheritedAssetDocument(asset.assetId, document.documentId)}
              onDownloaded={(document, signatureValid) =>
                setToast({ title: `Đã tải xuống ${document.fileName}`, detail: signatureValid ? 'Chữ ký số của tệp hợp lệ.' : undefined })
              }
            />
          </div>
        </section>
      </div>

      <AppToast show={Boolean(toast)} onClose={closeToast} title={toast?.title} detail={toast?.detail} />
    </div>
  )
}
