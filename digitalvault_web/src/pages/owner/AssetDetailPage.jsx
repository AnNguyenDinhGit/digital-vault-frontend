import { ArrowLeft, FileText, Lock } from 'lucide-react'
import { Alert } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import AssignBeneficiaryForm from '../../components/owner/AssignBeneficiaryForm'
import AssetTypeIcon from '../../components/owner/AssetTypeIcon'
import { useAssetDetail } from '../../hooks/useAssetDetail'
import { assetCode, assetTypeLabel, formatAllocation } from '../../utils/catalog'

const BENEFICIARY_STATUS_LABELS = { Active: 'Đang hiệu lực' }

function BackLink() {
  return (
    <Link to="/owner/assets" className="d-inline-flex align-items-center gap-2 fs-13 fw-medium text-slate-600 text-decoration-none">
      <ArrowLeft size={16} aria-hidden="true" />
      Quay lại danh mục
    </Link>
  )
}

// Trang chi tiết một tài sản: thông tin, người thụ hưởng (kèm form chỉ định) và giấy tờ đính kèm
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

      <section className="av-panel d-flex gap-3 align-items-start">
        <span className="av-asset-icon">
          <AssetTypeIcon type={asset.type} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="av-code-tag">{assetCode(asset)}</span>
            <span className="av-badge av-badge-muted">{assetTypeLabel(asset.type)}</span>
          </div>
          <h1 className="mt-2 mb-0 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
            {asset.name}
          </h1>
          {asset.description && (
            <p className="mt-2 mb-0 fs-13 text-slate-500" style={{ lineHeight: 1.65 }}>
              {asset.description}
            </p>
          )}
        </div>
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
                      <td className="fw-semibold text-ink">{b.fullName}</td>
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

        <section className="col-12 col-xl-5">
          <div className="av-panel d-flex flex-column gap-3 h-100">
            <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
              Giấy tờ đính kèm
            </h2>
            {asset.documents.length === 0 ? (
              <p className="av-empty mb-0">Chưa có giấy tờ nào.</p>
            ) : (
              <ul className="list-unstyled mb-0 d-flex flex-column gap-2" aria-label="Giấy tờ đính kèm">
                {asset.documents.map((document) => (
                  <li key={document.documentId} className="d-flex align-items-center gap-3 p-2 border rounded-3">
                    <span className="av-stat-icon">
                      <FileText size={16} aria-hidden="true" />
                    </span>
                    <div style={{ minWidth: 0 }} className="flex-grow-1">
                      <p className="mb-0 fs-13 fw-semibold text-ink text-truncate">{document.fileName}</p>
                      <p className="mb-0 font-mono fs-10 text-slate-400">{document.fileType}</p>
                    </div>
                    {document.isEncrypted && (
                      <span className="av-badge av-badge-ok">
                        <Lock size={10} aria-hidden="true" />
                        Đã mã hóa
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
