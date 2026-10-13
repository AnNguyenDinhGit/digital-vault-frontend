import { Briefcase, FileCheck, UserCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { executorBadgeClass, executorStatusLabel } from '../../utils/executor'

const pad2 = (value) => String(value).padStart(2, '0')

function StatCard({ label, icon: Icon, tone, children }) {
  return (
    <div role="group" aria-label={label} className="av-stat">
      <div style={{ minWidth: 0 }}>
        <p className="av-stat-label">{label}</p>
        {children}
      </div>
      <span className={`av-stat-icon ${tone}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
    </div>
  )
}

// 4 thẻ thống kê; executor = { status: 'loading' | 'ready' | 'error', data } của kho đang chọn
export default function StatCards({ stats, executor }) {
  const { totalAssets, beneficiaryCount, documentedCount, missingDocumentCount, encryptedPercent } = stats
  return (
    <div className="av-stat-grid">
      <StatCard label="TỔNG TÀI SẢN SỐ" icon={Briefcase} tone="">
        <p className="mb-0 mt-1">
          <span className="av-stat-value">{pad2(totalAssets)}</span>
          <span className="av-stat-unit">mục</span>
        </p>
        <p className="mb-0 mt-1 fs-11 text-brand">
          {encryptedPercent === null ? 'Chưa có giấy tờ nào' : `${encryptedPercent}% giấy tờ đã mã hóa AES-256-GCM`}
        </p>
      </StatCard>

      <StatCard label="NGƯỜI THỤ HƯỞNG" icon={Users} tone="is-brand">
        <p className="mb-0 mt-1">
          <span className="av-stat-value">{pad2(beneficiaryCount)}</span>
          <span className="av-stat-unit">người</span>
        </p>
        <p className="mb-0 mt-1 fs-11 text-brand">Đã được chỉ định trên các tài sản</p>
      </StatCard>

      <StatCard label="GIẤY TỜ ĐÍNH KÈM" icon={FileCheck} tone="is-amber">
        <p className="mb-0 mt-1">
          <span className="av-stat-value">{`${pad2(documentedCount)}/${pad2(totalAssets)}`}</span>
          <span className="av-stat-unit">tài sản</span>
        </p>
        <p className="mb-0 mt-1 fs-11 text-slate-500">
          {missingDocumentCount === 0 ? 'Mọi tài sản đều có giấy tờ' : `${missingDocumentCount} tài sản chưa có giấy tờ`}
        </p>
      </StatCard>

      <StatCard label="DIGITAL EXECUTOR" icon={UserCheck} tone="">
        {executor?.status === 'loading' && <p className="mb-0 mt-1 fs-12 text-slate-400">Đang tải...</p>}
        {executor?.status === 'ready' && executor.data && (
          <>
            <p className="mb-0 mt-1 fw-bold text-ink text-truncate" style={{ fontSize: 18 }}>
              {executor.data.fullName}
            </p>
            <p className="mb-0 mt-1">
              <span className={`av-badge ${executorBadgeClass(executor.data.status)}`}>{executorStatusLabel(executor.data.status)}</span>
            </p>
          </>
        )}
        {(!executor || executor.status === 'error' || (executor.status === 'ready' && !executor.data)) && (
          <>
            <p className="mb-0 mt-1 fw-bold text-slate-400" style={{ fontSize: 18 }}>
              Chưa gán
            </p>
            <p className="mb-0 mt-1 fs-11">
              <Link to="/owner/executor" className="av-link-btn text-decoration-none">
                Gán người thi hành
              </Link>
            </p>
          </>
        )}
      </StatCard>
    </div>
  )
}
