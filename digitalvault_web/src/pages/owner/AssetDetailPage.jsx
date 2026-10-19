import { ArrowLeft, Download, FileText, Lock, Pencil, Plus, ShieldCheck } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppToast from '../../components/common/AppToast'
import MockNotice from '../../components/common/MockNotice'
import AssetExecutorSection from '../../components/owner/AssetExecutorSection'
import AssetTypeIcon from '../../components/owner/AssetTypeIcon'
import AssignBeneficiaryForm from '../../components/owner/AssignBeneficiaryForm'
import EditAssetModal from '../../components/owner/EditAssetModal'
import UploadDocumentModal from '../../components/owner/UploadDocumentModal'
import { downloadDocument, simulateBeneficiaryAccept } from '../../callapi/ownerApi'
import { useAssetDetail } from '../../hooks/useAssetDetail'
import { MOCK_MODE } from '../../mocks/mode'
import { assetCode, assetTypeLabel, fileTypeLabel, formatAllocation, getInitials } from '../../utils/catalog'
import { downloadBlob } from '../../utils/download'

const BENEFICIARY_STATUS_LABELS = { Active: 'Đang hiệu lực', Pending: 'Chờ xác nhận' }
const ASSET_STATUS_LABELS = { Active: 'Đang hoạt động', Revoked: 'Đã thu hồi' }

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
export default function AssetDetailPage({ mockMode = MOCK_MODE }) {
  const { assetId } = useParams()
  const { status, error, asset, beneficiaries, refresh } = useAssetDetail(assetId)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [downloadError, setDownloadError] = useState('')
  const [accepting, setAccepting] = useState(false)
  const navigate = useNavigate()
  const closeToast = useCallback(() => setToast(null), [])

  const handleUploaded = () => {
    setIsUploadOpen(false)
    refresh()
  }

  // Chỉ có ở mock đầy đủ: giả lập người thụ hưởng bấm xác nhận trong email
  const handleSimulateAccept = async (beneficiary) => {
    setAccepting(true)
    try {
      await simulateBeneficiaryAccept(asset.assetId, beneficiary.beneficiaryId)
      refresh()
    } finally {
      setAccepting(false)
    }
  }

  const handleDownload = async (document) => {
    setDownloadingId(document.documentId)
    setDownloadError('')
    try {
      downloadBlob(document.fileName, await downloadDocument(asset.assetId, document.documentId))
      setToast({ title: `Đã tải xuống ${document.fileName}` })
    } catch (error) {
      const reason = error?.status === 404 ? 'Không tìm thấy giấy tờ.' : error?.message
      setDownloadError(`Không tải được ${document.fileName}. ${reason ?? ''}`.trim())
    } finally {
      setDownloadingId(null)
    }
  }

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

  // Chỉ người thụ hưởng đã xác nhận (Active) mới chiếm tỷ lệ phân bổ; phân bổ Pending chưa được tính
  const confirmed = beneficiaries.filter((b) => b.status !== 'Pending')
  const hasPending = beneficiaries.some((b) => b.status === 'Pending')
  const allocated = Math.round(confirmed.reduce((sum, b) => sum + b.allocation, 0) * 100) / 100
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
        <button type="button" onClick={() => setIsEditOpen(true)} className="av-ghost-btn is-brand">
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
              <AllocationBar beneficiaries={confirmed} allocated={allocated} />
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
                      <td>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <span>{BENEFICIARY_STATUS_LABELS[b.status] ?? b.status}</span>
                          {b.status === 'Pending' && mockMode === 'full' && (
                            <button type="button" className="av-ghost-btn" disabled={accepting} onClick={() => handleSimulateAccept(b)}>
                              Mô phỏng xác nhận
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {hasPending && (
              <p className="mb-0 fs-12 text-slate-500">
                Người thụ hưởng ở trạng thái "Chờ xác nhận" chưa được tính vào tỷ lệ phân bổ và chưa thể sửa hay gỡ cho tới khi họ xác nhận lời chỉ định (BE đã gửi email cho họ).
              </p>
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
            <div className="d-flex align-items-center justify-content-between gap-2">
              <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
                Giấy tờ đính kèm
              </h2>
              <Button type="button" variant="primary" className="av-btn av-btn-sm" onClick={() => setIsUploadOpen(true)}>
                <Plus size={16} aria-hidden="true" />
                Thêm giấy tờ
              </Button>
            </div>
            <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} message="Nội dung tải về là bản mô phỏng (chế độ mock đầy đủ), không phải giấy tờ gốc." />
            {downloadError && <Alert variant="danger" className="av-alert mb-0">{downloadError}</Alert>}
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
                    <button
                      type="button"
                      className="av-ghost-btn"
                      disabled={downloadingId !== null}
                      onClick={() => handleDownload(document)}
                    >
                      <Download size={14} aria-hidden="true" />
                      {downloadingId === document.documentId ? 'Đang tải...' : 'Tải về'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <AssetExecutorSection />
        </div>
      </div>
      {isEditOpen && (
        <EditAssetModal
          asset={asset}
          impact={{ documents: asset.documents.length, beneficiaries: beneficiaries.length }}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => {
            setIsEditOpen(false)
            setToast({ title: 'Đã cập nhật tài sản' })
            refresh()
          }}
          onRevoked={() => navigate('/owner/assets')}
        />
      )}
      <AppToast show={Boolean(toast)} onClose={closeToast} title={toast?.title} />
      <UploadDocumentModal
        open={isUploadOpen}
        asset={asset}
        beneficiaries={confirmed}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={handleUploaded}
      />
    </div>
  )
}
