import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Form } from 'react-bootstrap'
import { PAGE_SIZE_OPTIONS } from '../../utils/catalog'

// Thanh phân trang kèm lựa chọn số lượng mỗi trang
export default function Pagination({ pageData, pageSize, onPageChange, onPageSizeChange }) {
  const { page, totalPages, total, from, to } = pageData
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  return (
    <div className="av-pagination">
      <div className="d-flex flex-wrap align-items-center gap-3 fs-12 text-slate-500">
        <span>{`Hiển thị ${from} - ${to} trong tổng số ${total} tài sản số`}</span>
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="catalog-page-size" className="mb-0">
            Số lượng
          </label>
          <Form.Select
            id="catalog-page-size"
            size="sm"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            style={{ width: 'auto' }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {`${size} tài sản / trang`}
              </option>
            ))}
          </Form.Select>
        </div>
      </div>
      <nav aria-label="Phân trang" className="d-flex align-items-center gap-1">
        <button type="button" className="av-page-btn" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={14} aria-hidden="true" /> Trước
        </button>
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            className="av-page-btn"
            aria-label={`Trang ${number}`}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className="av-page-btn"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Tiếp <ChevronRight size={14} aria-hidden="true" />
        </button>
      </nav>
    </div>
  )
}
