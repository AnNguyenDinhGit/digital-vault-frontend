import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  Lock,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { Alert, Badge, Button, Col, Row, Table } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import {
  downloadLegalAssetDocument,
  downloadLegalHandoverDocument,
} from '../../callapi/legalApi'
import AppToast from '../../components/common/AppToast'
import HandoverStatusBadge from '../../components/executor/HandoverStatusBadge'
import ReviewActionModal from '../../components/legal/ReviewActionModal'
import { useLegalHandoverDetail } from '../../hooks/useLegalHandoverDetail'
import { downloadBlob } from '../../utils/download'
import { handoverStatusInfo } from '../../utils/handover'
import { formatDateTime } from '../../utils/proofOfLife'

const CASE_STATUS_LABELS = {
  Pending: 'Chờ bàn giao',
  In_Progress: 'Đang chuyển giao',
  Completed: 'Đã hoàn tất',
  Received: 'Đã nhận tài sản',
  Cancelled: 'Đã hủy',
}

export default function LegalHandoverDetailPage() {
  const { requestId } = useParams()
  const { status, error, handover, reload } = useLegalHandoverDetail(requestId)

  const [reviewModalType, setReviewModalType] = useState(null)
  const [reviewResult, setReviewResult] = useState(null)
  const [downloadingDocId, setDownloadingDocId] = useState(null)
  const [downloadingAssetDocId, setDownloadingAssetDocId] = useState(null)
  const [downloadError, setDownloadError] = useState('')
  const [toast, setToast] = useState(null)

  const closeToast = useCallback(() => setToast(null), [])

  // Tải giấy tờ chứng tử / bằng chứng Executor đã nộp
  const handleDownloadHandoverDoc = async (doc) => {
    setDownloadingDocId(doc.documentId)
    setDownloadError('')
    try {
      const { blob, signatureValid } = await downloadLegalHandoverDocument(handover.requestId, doc.documentId)
      downloadBlob(doc.fileName || `document-${doc.documentId}.bin`, blob)
      setToast({
        title: `Đã tải xuống ${doc.fileName || 'giấy tờ hồ sơ'}`,
        detail: signatureValid ? 'Chữ ký số hợp lệ.' : undefined,
      })
    } catch (err) {
      setDownloadError(`Không thể tải ${doc.fileName || 'tài liệu'}: ${err?.message || 'Lỗi kết nối'}`)
    } finally {
      setDownloadingDocId(null)
    }
  }

  // Tải tài liệu của tài sản
  const handleDownloadAssetDoc = async (doc) => {
    setDownloadingAssetDocId(doc.documentId)
    setDownloadError('')
    try {
      const { blob } = await downloadLegalAssetDocument(handover.requestId, doc.documentId)
      downloadBlob(doc.fileName || `asset-doc-${doc.documentId}.bin`, blob)
      setToast({
        title: `Đã tải xuống tài liệu tài sản ${doc.fileName || doc.documentId}`,
      })
    } catch (err) {
      setDownloadError(`Không thể tải tài liệu tài sản: ${err?.message || 'Lỗi kết nối'}`)
    } finally {
      setDownloadingAssetDocId(null)
    }
  }

  // Xử lý sau khi thẩm định thành công (Approve / Reject / Additional Info)
  const handleReviewSuccess = (reviewDto) => {
    setReviewModalType(null)
    setReviewResult(reviewDto)
    setToast({
      title: 'Đã lưu kết quả thẩm định pháp lý thành công!',
      detail: `Trạng thái mới: ${reviewDto?.status || 'Đã cập nhật'}`,
    })
    // Tải lại trang chi tiết hồ sơ ngay sau khi thẩm định
    reload()
  }

  if (status === 'loading') {
    return (
      <div className="p-5 text-center">
        <p role="status" className="d-inline-flex align-items-center gap-3 fs-14 text-slate-500">
          <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
          Đang tải chi tiết hồ sơ thẩm định...
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="d-flex flex-column gap-3">
        <Link to="/verifier/pending" className="d-inline-flex align-items-center gap-2 fs-13 text-slate-600 text-decoration-none">
          <ArrowLeft size={16} aria-hidden="true" /> Quay lại danh sách chờ thẩm định
        </Link>
        <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between mb-0">
          <span>{error?.status === 404 ? 'Không tìm thấy hồ sơ bàn giao.' : error?.message || 'Lỗi khi tải hồ sơ.'}</span>
          <Button type="button" variant="light" size="sm" className="border" onClick={reload}>
            Thử lại
          </Button>
        </Alert>
      </div>
    )
  }

  if (!handover) return null

  const isPendingLegal = handover.status === 'Pending_Legal'
  const handoverDocs = handover.documents ?? []
  const assetDocs = handover.assetDocuments ?? []
  const cases = handover.cases ?? []

  return (
    <div className="d-flex flex-column gap-4">
      {/* Liên kết quay lại */}
      <div>
        <Link
          to="/verifier/pending"
          className="d-inline-flex align-items-center gap-2 fs-13 fw-medium text-slate-600 text-decoration-none hover-primary"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Quay lại danh sách chờ thẩm định
        </Link>
      </div>

      {/* Banner thông tin hồ sơ */}
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <FileCheck size={22} className="text-brand" aria-hidden="true" />
          </span>
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h1 className="mb-0 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
                {`Hồ sơ thẩm định #${handover.requestId}`}
              </h1>
              <HandoverStatusBadge status={handover.status} />
            </div>
            <p className="mb-0 fs-12 text-slate-500 d-flex flex-wrap align-items-center gap-2">
              <span>{`Kho di sản #${handover.vaultId}`}</span>
              <span aria-hidden="true">·</span>
              <span>{`Khởi tạo lúc ${formatDateTime(handover.initiatedAt)}`}</span>
              {handover.requestType && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{`Loại yêu cầu: ${handover.requestType}`}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="light"
          className="av-btn av-btn-sm border d-flex align-items-center gap-2"
          onClick={reload}
          title="Tải lại chi tiết hồ sơ"
        >
          <RefreshCw size={14} aria-hidden="true" />
          <span>Làm mới</span>
        </Button>
      </section>

      {/* Thông báo kết quả thẩm định vừa thực hiện (ReviewDto) */}
      {reviewResult && (
        <Alert variant="success" className="av-alert d-flex flex-column gap-2 mb-0" dismissible onClose={() => setReviewResult(null)}>
          <div className="d-flex align-items-center gap-2 fw-bold fs-14">
            <CheckCircle2 size={16} />
            Đã lưu thẩm định thành công!
          </div>
          <div className="fs-12 text-slate-700">
            <div><strong>Mã thẩm định:</strong> #{reviewResult.verificationId}</div>
            <div><strong>Trạng thái cập nhật:</strong> {handoverStatusInfo(reviewResult.status).text}</div>
            {reviewResult.comment && <div><strong>Ý kiến thẩm định:</strong> {reviewResult.comment}</div>}
            {reviewResult.reviewedAt && <div><strong>Thời gian thẩm định:</strong> {formatDateTime(reviewResult.reviewedAt)}</div>}
          </div>
        </Alert>
      )}

      {/* KHU VỰC HÀNH ĐỘNG THẨM ĐỊNH (3 NÚT: DUYỆT - TỪ CHỐI - YÊU CẦU BỔ SUNG) */}
      <section className="av-panel" aria-label="Hành động thẩm định pháp lý">
        <div className="d-flex flex-column gap-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h2 className="mb-1 fw-bold text-ink fs-16">
                Hành động thẩm định pháp lý
              </h2>
              <p className="mb-0 fs-12 text-slate-500">
                Thẩm định tính xác thực của giấy chứng tử, bằng chứng pháp lý và các tài sản thừa kế.
              </p>
            </div>

            {/* 3 nút hành động */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="success"
                className="d-flex align-items-center gap-2 fs-13 fw-semibold px-3 py-2"
                disabled={!isPendingLegal}
                onClick={() => setReviewModalType('approve')}
                title={isPendingLegal ? 'Phê duyệt hồ sơ bàn giao' : 'Chỉ được thẩm định khi hồ sơ ở trạng thái Pending_Legal'}
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                Duyệt hồ sơ
              </Button>

              <Button
                type="button"
                variant="danger"
                className="d-flex align-items-center gap-2 fs-13 fw-semibold px-3 py-2"
                disabled={!isPendingLegal}
                onClick={() => setReviewModalType('reject')}
                title={isPendingLegal ? 'Từ chối hồ sơ bàn giao' : 'Chỉ được thẩm định khi hồ sơ ở trạng thái Pending_Legal'}
              >
                <XCircle size={16} aria-hidden="true" />
                Từ chối
              </Button>

              <Button
                type="button"
                variant="warning"
                className="d-flex align-items-center gap-2 fs-13 fw-semibold px-3 py-2 text-dark"
                disabled={!isPendingLegal}
                onClick={() => setReviewModalType('additional-info')}
                title={isPendingLegal ? 'Yêu cầu Executor bổ sung thông tin' : 'Chỉ được thẩm định khi hồ sơ ở trạng thái Pending_Legal'}
              >
                <AlertCircle size={16} aria-hidden="true" />
                Yêu cầu bổ sung thông tin
              </Button>
            </div>
          </div>

          {/* Cảnh báo nếu hồ sơ không ở trạng thái Pending_Legal */}
          {!isPendingLegal && (
            <div className="p-3 rounded bg-light border border-warning-subtle d-flex align-items-center gap-2 fs-12 text-slate-600">
              <Clock size={16} className="text-warning flex-shrink-0" />
              <span>
                <strong>Lưu ý:</strong> Hồ sơ hiện ở trạng thái <em>{handoverStatusInfo(handover.status).text}</em>. Chỉ những hồ sơ ở trạng thái <strong>Chờ thẩm định pháp lý (Pending_Legal)</strong> mới được thực hiện hành động thẩm định.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Lỗi download nếu có */}
      {downloadError && (
        <Alert variant="danger" className="av-alert mb-0" dismissible onClose={() => setDownloadError('')}>
          {downloadError}
        </Alert>
      )}

      {/* Grid: Giấy tờ chứng tử & Bằng chứng vs Tài liệu tài sản */}
      <Row className="g-4">
        {/* CỘT 1: Giấy tờ chứng tử và bằng chứng Executor nộp */}
        <Col xs={12} lg={6}>
          <section className="av-panel h-100 d-flex flex-column gap-3">
            <div className="d-flex align-items-center justify-content-between">
              <h2 className="mb-0 fw-bold text-ink fs-15 d-flex align-items-center gap-2">
                <FileText size={18} className="text-brand" />
                Giấy chứng tử &amp; Bằng chứng Executor nộp
              </h2>
              <Badge bg="secondary" className="fs-11 fw-normal">
                {handoverDocs.length} tệp
              </Badge>
            </div>

            {handoverDocs.length === 0 ? (
              <p className="av-empty mb-0 fs-13 text-slate-500 py-4 text-center">
                Người thi hành chưa nộp giấy tờ nào trong hồ sơ này.
              </p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {handoverDocs.map((doc) => (
                  <div key={doc.documentId} className="p-3 border rounded-3 bg-white d-flex align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3 overflow-hidden">
                      <span className="av-icon-tile" style={{ width: 36, height: 36, minWidth: 36 }}>
                        <FileText size={16} />
                      </span>
                      <div className="overflow-hidden">
                        <p className="mb-0 fs-13 fw-semibold text-ink text-truncate" title={doc.fileName}>
                          {doc.fileName || `Tài liệu #${doc.documentId}`}
                        </p>
                        <div className="d-flex align-items-center gap-2 fs-11 text-slate-500 mt-1">
                          {doc.fileType && <span>{doc.fileType}</span>}
                          {doc.isEncrypted && (
                            <span className="badge bg-light text-secondary border d-inline-flex align-items-center gap-1">
                              <Lock size={10} /> Đã mã hóa
                            </span>
                          )}
                          {doc.signatureValid !== null && (
                            <span className={`badge ${doc.signatureValid ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                              {doc.signatureValid ? 'Chữ ký hợp lệ' : 'Chữ ký chưa xác thực'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline-primary"
                      size="sm"
                      className="d-inline-flex align-items-center gap-1 flex-shrink-0 fs-12 px-3"
                      disabled={downloadingDocId === doc.documentId}
                      onClick={() => handleDownloadHandoverDoc(doc)}
                    >
                      <Download size={13} />
                      {downloadingDocId === doc.documentId ? 'Đang tải...' : 'Tải về'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Col>

        {/* CỘT 2: Tài liệu của tài sản (Asset Documents) */}
        <Col xs={12} lg={6}>
          <section className="av-panel h-100 d-flex flex-column gap-3">
            <div className="d-flex align-items-center justify-content-between">
              <h2 className="mb-0 fw-bold text-ink fs-15 d-flex align-items-center gap-2">
                <ShieldCheck size={18} className="text-brand" />
                Tài liệu của tài sản trong kho
              </h2>
              <Badge bg="secondary" className="fs-11 fw-normal">
                {assetDocs.length} tệp
              </Badge>
            </div>

            {assetDocs.length === 0 ? (
              <p className="av-empty mb-0 fs-13 text-slate-500 py-4 text-center">
                Không có tài liệu đính kèm tài sản riêng trong hồ sơ này.
              </p>
            ) : (
              <div className="d-flex flex-column gap-2">
                {assetDocs.map((doc) => (
                  <div key={doc.documentId} className="p-3 border rounded-3 bg-white d-flex align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3 overflow-hidden">
                      <span className="av-icon-tile" style={{ width: 36, height: 36, minWidth: 36 }}>
                        <FileCheck size={16} />
                      </span>
                      <div className="overflow-hidden">
                        <p className="mb-0 fs-13 fw-semibold text-ink text-truncate" title={doc.fileName}>
                          {doc.fileName || `Tài liệu tài sản #${doc.documentId}`}
                        </p>
                        <div className="d-flex align-items-center gap-2 fs-11 text-slate-500 mt-1">
                          {doc.fileType && <span>{doc.fileType}</span>}
                          {doc.isEncrypted && (
                            <span className="badge bg-light text-secondary border d-inline-flex align-items-center gap-1">
                              <Lock size={10} /> Đã mã hóa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline-primary"
                      size="sm"
                      className="d-inline-flex align-items-center gap-1 flex-shrink-0 fs-12 px-3"
                      disabled={downloadingAssetDocId === doc.documentId}
                      onClick={() => handleDownloadAssetDoc(doc)}
                    >
                      <Download size={13} />
                      {downloadingAssetDocId === doc.documentId ? 'Đang tải...' : 'Tải về'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Col>
      </Row>

      {/* Danh sách các tài sản và phân bổ thừa kế trong hồ sơ */}
      <section className="av-panel d-flex flex-column gap-3">
        <h2 className="mb-0 fw-bold text-ink fs-15">
          Danh mục tài sản &amp; Người nhận phân bổ ({cases.length})
        </h2>

        {cases.length === 0 ? (
          <p className="av-empty mb-0 fs-13 text-slate-500 py-3">Hồ sơ chưa có phân công tài sản nào.</p>
        ) : (
          <div className="table-responsive">
            <Table hover className="align-middle mb-0 fs-13">
              <thead className="bg-light">
                <tr className="fs-11 text-slate-500 text-uppercase border-bottom">
                  <th scope="col" className="py-2">Mã bàn giao</th>
                  <th scope="col" className="py-2">Tài sản ID</th>
                  <th scope="col" className="py-2">Người thụ hưởng ID</th>
                  <th scope="col" className="py-2">Trạng thái bàn giao</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.handoverId}>
                    <td className="fw-semibold text-ink">#{c.handoverId}</td>
                    <td>{`Tài sản #${c.assetId}`}</td>
                    <td>{`Người nhận #${c.beneficiaryId}`}</td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {CASE_STATUS_LABELS[c.status] || c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>

      {/* Modal xác nhận thẩm định kèm ô nhập nhận xét validation 1-2000 ký tự */}
      {reviewModalType && (
        <ReviewActionModal
          show={Boolean(reviewModalType)}
          type={reviewModalType}
          requestId={handover.requestId}
          onClose={() => setReviewModalType(null)}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Toast thông báo */}
      <AppToast
        show={Boolean(toast)}
        onClose={closeToast}
        title={toast?.title}
        detail={toast?.detail}
      />
    </div>
  )
}
