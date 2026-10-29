import { KeyRound, RefreshCw } from 'lucide-react'
import { Button } from 'react-bootstrap'
import { getAdminRoles } from '../../callapi/adminApi'
import AdminResourceState from '../../components/admin/AdminResourceState'
import MockNotice from '../../components/common/MockNotice'
import { useAdminResource } from '../../hooks/useAdminResource'
import { MOCK_MODE } from '../../mocks/mode'
import { permissionLabel, roleLabel } from '../../utils/admin'

// Trang "Vai trò & phân quyền" của Admin: ma trận quyền của 5 vai trò hệ thống (chỉ xem, quyền do hệ thống định nghĩa)
export default function AdminRolesPage({ mockMode = MOCK_MODE }) {
  const { data: roles, error, loading, reload } = useAdminResource(getAdminRoles)

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Vai trò &amp; phân quyền
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Danh mục quyền của từng vai trò và số người dùng đang hoạt động. Gán vai trò cho người dùng ở mục Quản lý người dùng.</p>
          </div>
        </div>
        <Button type="button" variant="light" className="av-btn av-btn-sm border" disabled={loading} onClick={reload}>
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </Button>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      <AdminResourceState error={error} loading={loading} hasData={Boolean(roles)} loadingText="Đang tải ma trận phân quyền..." onRetry={reload} />

      {roles && (
        <div className="d-flex flex-column gap-3">
          {roles.map((role) => (
            <article key={role.roleId} className="av-panel d-flex flex-column gap-3" aria-label={`${roleLabel(role.roleName)} (${role.roleName})`}>
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                <div>
                  <h2 className="mb-1 fw-bold text-ink" style={{ fontSize: 17 }}>
                    {roleLabel(role.roleName)}
                    <span className="ms-2 font-mono fs-11 text-slate-400">{role.roleName}</span>
                  </h2>
                  <p className="mb-0 fs-13 text-slate-500">{role.description}</p>
                </div>
                <span className="av-badge av-badge-info">{`${role.activeUsersCount} người dùng đang hoạt động`}</span>
              </div>
              <ul className="list-unstyled mb-0 d-flex flex-wrap gap-2">
                {role.permissions.map((permission) => (
                  <li key={permission}>
                    <span className="av-badge av-badge-muted" title={permission}>
                      {permissionLabel(permission)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
