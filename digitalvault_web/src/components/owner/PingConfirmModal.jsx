import { HeartPulse, X } from 'lucide-react'
import { Alert, Button, Modal } from 'react-bootstrap'
import ConnectionError from '../common/ConnectionError'

// Hộp thoại xác nhận điểm danh: có đủ trạng thái đang xử lý, lỗi từ máy chủ và mất kết nối
export default function PingConfirmModal({ open, isSubmitting, error, onConfirm, onClose }) {
  return (
    <Modal show={open} onHide={onClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="ping-confirm-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <HeartPulse size={20} aria-hidden="true" />
          </span>
          <div>
            <span className="av-modal-tag av-mono-tag">PROOF OF LIFE</span>
            <h2 id="ping-confirm-title" className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Xác nhận điểm danh
            </h2>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <div className="av-modal-body d-flex flex-column gap-3">
        <p className="mb-0 fs-13 text-slate-600">
          Xác nhận bạn vẫn an toàn và đang hoạt động để duy trì trạng thái bảo vệ kho di sản số.
        </p>
        {isSubmitting && (
          <p className="mb-0 d-flex align-items-center gap-2 fs-12 text-slate-500">
            <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
            Đang đồng bộ điểm danh lên máy chủ...
          </p>
        )}
        {error?.network && (
          <ConnectionError
            title="Không thể kết nối đến máy chủ điểm danh"
            message="Lần điểm danh này chưa được ghi nhận. Vui lòng kiểm tra đường truyền rồi thử lại."
            onRetry={onConfirm}
            disabled={isSubmitting}
          />
        )}
        {error && !error.network && <Alert variant="danger" className="av-alert">{error.message}</Alert>}
      </div>

      <div className="av-modal-foot justify-content-end gap-2">
        <Button type="button" variant="light" onClick={onClose} disabled={isSubmitting} className="av-btn av-btn-md border">
          Hủy
        </Button>
        <Button type="button" variant="primary" onClick={onConfirm} disabled={isSubmitting} className="av-btn av-btn-md">
          {isSubmitting ? 'Đang xử lý dữ liệu...' : 'Xác nhận điểm danh'}
        </Button>
      </div>
    </Modal>
  )
}
