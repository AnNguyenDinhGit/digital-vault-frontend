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
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-red-500"> *</span>}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={`h-11 w-full rounded-lg border bg-white text-[14px] text-ink placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-primary'
          } ${Icon ? 'pl-10' : 'pl-3.5'} ${rightSlot ? 'pr-11' : 'pr-3.5'} ${inputClassName}`}
          {...inputProps}
        />
        {rightSlot && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-[12px] text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
