import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Form } from 'react-bootstrap'

const SIZE_OPTIONS = [10, 20, 50]

// Phân trang cho danh sách Admin: BE chỉ trả PageDto (không có tổng số) nên chỉ biết còn trang sau khi trang đầy
export default function AdminPager({ page, pageSize, count, onPageChange, onPageSizeChange }) {
  const hasNext = count >= pageSize
  return (
    <div className="av-pagination">
      <div className="d-flex align-items-center gap-2 fs-12 text-slate-500">
        <label htmlFor="admin-page-size" className="mb-0">
          Số lượng
        </label>
        <Form.Select
          id="admin-page-size"
          size="sm"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          style={{ width: 'auto' }}
        >
          {SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {`${size} bản ghi / trang`}
            </option>
          ))}
        </Form.Select>
      </div>
      <nav aria-label="Phân trang" className="d-flex align-items-center gap-2">
        <button type="button" className="av-page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={14} aria-hidden="true" /> Trước
        </button>
        <span className="fs-12 text-slate-500" aria-current="page">{`Trang ${page}`}</span>
        <button type="button" className="av-page-btn" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Tiếp <ChevronRight size={14} aria-hidden="true" />
        </button>
      </nav>
    </div>
  )
}
