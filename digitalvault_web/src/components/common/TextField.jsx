import { Form } from 'react-bootstrap'

// Ô nhập liệu dùng chung: label, icon bên trái, nội dung phụ bên phải và thông báo lỗi
export default function TextField({
  id,
  label,
  required = false,
  icon: Icon,
  error,
  labelAside,
  rightSlot,
  className = '',
  inputClassName = '',
  ...inputProps
}) {
  const errorId = error ? `${id}-error` : undefined
  const inputClasses = ['av-input', Icon && 'av-input-icon', rightSlot && 'av-input-right', inputClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <label htmlFor={id} className="av-label">
          {label}
          {required && <span className="ms-1 text-danger"> *</span>}
        </label>
        {labelAside}
      </div>
      <div className="position-relative">
        {Icon && <Icon size={16} className="av-field-icon" aria-hidden="true" />}
        <Form.Control
          id={id}
          isInvalid={Boolean(error)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={inputClasses}
          {...inputProps}
        />
        {rightSlot && <div className="av-field-right">{rightSlot}</div>}
      </div>
      {error && (
        <p id={errorId} className="av-error">
          {error}
        </p>
      )}
    </div>
  )
}
