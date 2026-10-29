import { Alert, Button } from 'react-bootstrap'

// Trạng thái chung của các trang Admin tải một tài nguyên: lỗi kèm nút thử lại, hoặc đang tải.
// Trả null khi đã có dữ liệu để trang tự vẽ phần nội dung.
export default function AdminResourceState({ error, loading, hasData, loadingText, onRetry }) {
  if (error) {
    return (
      <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3 mb-0">
        <span>{error}</span>
        <Button type="button" variant="light" size="sm" className="border" onClick={onRetry}>
          Thử lại
        </Button>
      </Alert>
    )
  }
  if (loading && !hasData) {
    return (
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500 mb-0">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        {loadingText}
      </p>
    )
  }
  return null
}
