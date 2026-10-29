import { Link } from 'react-router-dom'
import { formatAllocation, getInitials } from '../../utils/catalog'

// Thẻ một người thụ hưởng: họ hưởng những tài sản nào và bao nhiêu %, kèm nút sửa phân quyền và xóa
export default function BeneficiaryPersonCard({ person, onEdit, onRemove }) {
  const titleId = `beneficiary-title-${person.beneficiaryId}`
  // Phân bổ chờ xác nhận chưa sửa hay gỡ được (BE chỉ cho thao tác trên phân bổ đang hiệu lực)
  const hasActive = person.items.some((item) => item.status !== 'Pending')
  return (
    <article aria-labelledby={titleId} className="av-asset-card">
      <div className="d-flex gap-3" style={{ minWidth: 0, flex: '1 1 420px' }}>
        <span className="av-avatar">{getInitials(person.fullName)}</span>
        <div style={{ minWidth: 0 }} className="flex-grow-1">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <h3 id={titleId} className="mb-0 fw-bold text-ink" style={{ fontSize: 15 }}>
              {person.fullName}
            </h3>
            <span className="av-badge av-badge-info">{`${person.totalAssets} tài sản`}</span>
          </div>
          <ul className="list-unstyled mt-2 mb-0 d-flex flex-column gap-1">
            {person.items.map((item) => (
              <li key={item.assetId}>
                <Link
                  to={`/owner/assets/${item.assetId}`}
                  className="d-flex align-items-center justify-content-between gap-3 fs-12 text-slate-600 text-decoration-none"
                >
                  <span className="text-truncate">{item.assetName}</span>
                  <span className="d-flex align-items-center gap-2">
                    {item.status === 'Pending' && <span className="av-badge av-badge-warn">Chờ xác nhận</span>}
                    <span className="fw-semibold text-brand">{formatAllocation(item.allocation)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="d-flex gap-2">
        <button type="button" disabled={!hasActive} title={hasActive ? undefined : 'Chờ người thụ hưởng xác nhận trước khi sửa'} onClick={() => onEdit(person)} className="av-ghost-btn is-brand">
          Sửa phân quyền
        </button>
        <button type="button" disabled={!hasActive} title={hasActive ? undefined : 'Chờ người thụ hưởng xác nhận trước khi gỡ'} onClick={() => onRemove(person)} className="av-ghost-btn">
          Xóa
        </button>
      </div>
    </article>
  )
}
