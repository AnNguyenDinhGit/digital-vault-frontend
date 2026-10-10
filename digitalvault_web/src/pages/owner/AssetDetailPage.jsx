import { ArrowLeft, Download, FileText, Lock, Pencil, ShieldCheck } from 'lucide-react'
import { Alert } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import AssetTypeIcon from '../../components/owner/AssetTypeIcon'
import AssignBeneficiaryForm from '../../components/owner/AssignBeneficiaryForm'
import { useAssetDetail } from '../../hooks/useAssetDetail'
import { assetCode, assetTypeLabel, fileTypeLabel, formatAllocation, getInitials } from '../../utils/catalog'

const COMING_SOON = 'Sắp ra mắt'
const BENEFICIARY_STATUS_LABELS = { Active: 'Đang hiệu lực' }
const ASSET_STATUS_LABELS = { Active: 'Đang hoạt động' }

function BackLink() {
  return (
    <Link to="/owner/assets" className="d-inline-flex align-items-center gap-2 fs-13 fw-medium text-slate-600 text-decoration-none">
      <ArrowLeft size={16} aria-hidden="true" />
      Quay lại danh mục
    </Link>
  )
}

// Thanh tỷ lệ phân bổ: mỗi người hưởng một đoạn, phần trống là phần chưa phân bổ
function AllocationBar({ beneficiaries, allocated }) {
  return (
    <div
      className="av-progress"
      role="progressbar"
      aria-label="Tỷ lệ đã phân bổ"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={allocated}
    >
      {beneficiaries.map((b, index) => (
        <span
          key={b.beneficiaryId}
          className={`av-progress-seg is-${index % 4}`}
          style={{ width: `${b.allocation}%` }}
          title={`${b.fullName} ${formatAllocation(b.allocation)}`}
        />
      ))}
    </div>
  )
}

// Trang chi tiết một tài sản: thông tin, người thụ hưởng (kèm form chỉ định), giấy tờ và executor
export default function AssetDetailPage() {
  const { assetId } = useParams()
  const { status, error, asset, beneficiaries, refresh } = useAssetDetail(assetId)

  if (status === 'loading') {
    return (
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang tải chi tiết tài sản...
      </p>
    )
  }

  if (status === 'error') {
    return (
      <div className="d-flex flex-column gap-3">
        <BackLink />
        <Alert variant="danger" className="av-alert">
          {error?.status === 404 ? 'Không tìm thấy tài sản.' : error?.message}
        </Alert>
      </div>
    )
  }

  const allocated = Math.round(beneficiaries.reduce((sum, b) => sum + b.allocation, 0) * 100) / 100
  const remaining = Math.round((100 - allocated) * 100) / 100

  return (
    <div className="d-flex flex-column gap-4">
      <BackLink />

      <section className="av-panel d-flex flex-wrap gap-3 align-items-start justify-content-between">
        <div className="d-flex gap-3 align-items-start" style={{ minWidth: 0, flex: '1 1 420px' }}>
          <span className="av-asset-icon">
            <AssetTypeIcon type={asset.type} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="av-code-tag">{assetCode(asset)}</span>
              <span className="av-badge av-badge-muted">{assetTypeLabel(asset.type)}</span>
              <span className="av-badge av-badge-ok">
                <ShieldCheck size={10} aria-hidden="true" />
                {ASSET_STATUS_LABELS[asset.status] ?? asset.status}
              </span>
            </div>
            <h1 className="mt-2 mb-0 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              {asset.name}
            </h1>
            {asset.description && (
              <p className="mt-2 mb-0 fs-13 text-slate-500" style={{ lineHeight: 1.65 }}>
                {asset.description}
              </p>
            )}
            <div className="mt-3 d-flex flex-wrap gap-2">
              <span className="av-badge av-badge-info">{`${asset.documents.length} giấy tờ`}</span>
              <span className="av-badge av-badge-info">{`${beneficiaries.length} người thụ hưởng`}</span>
            </div>
          </div>
        </div>
        <button type="button" disabled title={COMING_SOON} className="av-ghost-btn is-brand">
          <Pencil size={14} aria-hidden="true" />
          Chỉnh sửa
        </button>
      </section>

      <div className="row g-4">
        <section className="col-12 col-xl-7">
          <div className="av-panel d-flex flex-column gap-3 h-100">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
                Người thụ hưởng
              </h2>
              <span className="av-badge av-badge-info">{`Đã phân bổ ${allocated}%`}</span>
            </div>

            <div>
              <AllocationBar beneficiaries={beneficiaries} allocated={allocated} />
              <p className="mt-2 mb-0 fs-12 text-slate-500">{`Còn chưa phân bổ ${remaining}%`}</p>
            </div>

            {beneficiaries.length === 0 ? (
              <p className="av-empty mb-0">Tài sản này chưa có người thụ hưởng.</p>
            ) : (
              <table className="table align-middle mb-0 fs-13" aria-label="Danh sách người thụ hưởng">
                <thead>
                  <tr className="fs-11 text-slate-500">
                    <th scope="col">Họ và tên</th>
                    <th scope="col">Tỷ lệ</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((b) => (
                    <tr key={b.beneficiaryId}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="av-avatar-sm" aria-hidden="true">
                            {getInitials(b.fullName)}
                          </span>
                          <span className="fw-semibold text-ink">{b.fullName}</span>
                        </div>
                      </td>
                      <td>{formatAllocation(b.allocation)}</td>
                      <td>{BENEFICIARY_STATUS_LABELS[b.status] ?? b.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="border-top pt-3">
              <h3 className="mb-3 fw-bold text-ink" style={{ fontSize: 14 }}>
                Chỉ định người thụ hưởng
              </h3>
              {remaining <= 0 ? (
                <p className="mb-0 fs-12 text-slate-500">Tài sản đã phân bổ đủ 100%.</p>
              ) : (
                <AssignBeneficiaryForm assetId={asset.assetId} remaining={remaining} onAssigned={refresh} />
              )}
            </div>
          </div>
        </section>

        <div className="col-12 col-xl-5 d-flex flex-column gap-4">
          <section className="av-panel d-flex flex-column gap-3">
            <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
              Giấy tờ đính kèm
            </h2>
            {asset.documents.length === 0 ? (
              <p className="av-empty mb-0">Chưa có giấy tờ nào.</p>
            ) : (
              <ul className="list-unstyled mb-0 d-flex flex-column gap-2" aria-label="Giấy tờ đính kèm">
                {asset.documents.map((document) => (
                  <li key={document.documentId} className="av-doc-item">
                    <span className="av-stat-icon">
                      <FileText size={16} aria-hidden="true" />
                    </span>
                    <div className="av-doc-main">
                      <p className="mb-0 fs-13 fw-semibold text-ink text-truncate">{document.fileName}</p>
                      <p className="mb-0 font-mono fs-10 text-slate-400">{fileTypeLabel(document.fileType)}</p>
                    </div>
                    {document.isEncrypted && (
                      <span className="av-badge av-badge-ok">
                        <Lock size={10} aria-hidden="true" />
                        Đã mã hóa
                      </span>
                    )}
                    <button type="button" disabled title={COMING_SOON} className="av-ghost-btn">
                      <Download size={14} aria-hidden="true" />
                      Tải về
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="av-panel d-flex flex-column gap-2" aria-labelledby="executor-title">
            <div className="d-flex align-items-center justify-content-between gap-2">
              <h2 id="executor-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
                Digital Executor giám sát
              </h2>
              <span className="av-soon-badge">{COMING_SOON}</span>
            </div>
            <p className="mb-0 fs-12 text-slate-500">
              Người thi hành được ủy quyền bàn giao tài sản này sẽ hiển thị tại đây khi tính năng sẵn sàng.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
