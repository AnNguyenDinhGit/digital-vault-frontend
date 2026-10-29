import { Form } from 'react-bootstrap'
import { formatFileSize } from '../../utils/catalog'

// Ô chọn file kèm nhãn, gợi ý, tên và dung lượng file đã chọn, thông báo lỗi
export default function FileField({ id, label, hint, accept, required = false, file, error, onChange }) {
  return (
    <div>
      <div className="mb-2">
        <label htmlFor={id} className="av-label">
          {label}
          {required && <span className="ms-1 text-danger"> *</span>}
        </label>
      </div>
      <Form.Control
        id={id}
        type="file"
        accept={accept}
        isInvalid={Boolean(error)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <p className="mt-1 mb-0 fs-11 text-slate-500">{file ? `${file.name} · ${formatFileSize(file.size)}` : hint}</p>
      {error && (
        <p id={`${id}-error`} className="av-error">
          {error}
        </p>
      )}
    </div>
  )
}
