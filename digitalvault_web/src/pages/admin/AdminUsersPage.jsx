import { UserPlus, Users } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { getAdminUsers } from '../../callapi/adminApi'
import AdminPager from '../../components/admin/AdminPager'
import CreateUserModal from '../../components/admin/CreateUserModal'
import EditUserModal from '../../components/admin/EditUserModal'
import AppToast from '../../components/common/AppToast'
import MockNotice from '../../components/common/MockNotice'
import { useAdminList } from '../../hooks/useAdminList'
import { useAuth } from '../../hooks/useAuth'
import { MOCK_MODE } from '../../mocks/mode'
import { ALL_ROLES, roleLabel, USER_STATUSES, userStatusInfo } from '../../utils/admin'
import { formatDate } from '../../utils/proofOfLife'

const BADGE_CLASS = { ok: 'av-badge-ok', warn: 'av-badge-warn', info: 'av-badge-info', muted: 'av-badge-muted' }

// Trang "Quản lý người dùng" của Admin: lọc theo vai trò/trạng thái, thêm người dùng, đổi vai trò và trạng thái
export default function AdminUsersPage({ mockMode = MOCK_MODE }) {
  const { user: currentUser } = useAuth()
  const [filters, setFilters] = useState({ role: '', status: '' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  const params = useMemo(() => ({ page, pageSize, ...filters }), [page, pageSize, filters])
  const { items: users, error, loading, reload } = useAdminList(getAdminUsers, params)

  const setFilter = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPage(1)
  }

  const closeModal = () => setModal(null)
  const finish = (title, detail) => {
    closeModal()
    setToast({ title, detail })
    reload()
  }

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <Users size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Quản lý người dùng
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Tạo tài khoản, phân quyền và khóa hoặc vô hiệu hóa người dùng hệ thống.</p>
          </div>
        </div>
        <Button type="button" variant="primary" className="av-btn av-btn-sm" onClick={() => setModal({ type: 'create' })}>
          <UserPlus size={16} aria-hidden="true" />
          Thêm người dùng
        </Button>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      <section className="av-panel d-flex flex-column gap-3" aria-label="Danh sách người dùng">
        <div className="row g-2">
          <div className="col-6 col-lg-3">
            <Form.Select aria-label="Lọc theo vai trò" value={filters.role} onChange={(event) => setFilter('role', event.target.value)}>
              <option value="">Tất cả vai trò</option>
              {ALL_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </Form.Select>
          </div>
          <div className="col-6 col-lg-3">
            <Form.Select aria-label="Lọc theo trạng thái" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              {USER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {userStatusInfo(status).text}
                </option>
              ))}
            </Form.Select>
          </div>
        </div>

        {error ? (
          <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3 mb-0">
            <span>{error}</span>
            <Button type="button" variant="light" size="sm" className="border" onClick={reload}>
              Thử lại
            </Button>
          </Alert>
        ) : loading && users.length === 0 ? (
          <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500 mb-0">
            <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
            Đang tải danh sách người dùng...
          </p>
        ) : users.length === 0 ? (
          <p className="av-empty mb-0">Không có người dùng phù hợp.</p>
        ) : (
          <div className="table-responsive" aria-busy={loading}>
            <table className="table align-middle mb-0 fs-13" aria-label="Danh sách người dùng">
              <thead>
                <tr className="fs-11 text-slate-500">
                  <th scope="col">Người dùng</th>
                  <th scope="col">Điện thoại</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">
                    <span className="visually-hidden">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const status = userStatusInfo(user.status)
                  return (
                    <tr key={user.userId}>
                      <td>
                        <p className="mb-0 fw-semibold text-ink">{user.fullName}</p>
                        <p className="mb-0 fs-12 text-slate-500">{user.email}</p>
                      </td>
                      <td>{user.phone || '—'}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <span key={role} className="av-badge av-badge-info">
                              {roleLabel(role)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`av-badge ${BADGE_CLASS[status.tone]}`}>{status.text}</span>
                      </td>
                      <td className="text-nowrap">{formatDate(user.createdAt)}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="av-ghost-btn is-brand"
                          aria-label={`Phân quyền ${user.fullName}`}
                          onClick={() => setModal({ type: 'edit', user })}
                        >
                          Phân quyền
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!error && users.length > 0 && (
          <AdminPager
            page={page}
            pageSize={pageSize}
            count={users.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        )}
      </section>

      {modal?.type === 'create' && (
        <CreateUserModal onClose={closeModal} onCreated={(user) => finish('Đã tạo người dùng', `${user.fullName} (${user.email})`)} />
      )}
      {modal?.type === 'edit' && (
        <EditUserModal
          user={modal.user}
          isSelf={modal.user.email === currentUser?.email}
          onClose={closeModal}
          onSaved={() => finish('Đã cập nhật người dùng', modal.user.fullName)}
        />
      )}

      <AppToast show={Boolean(toast)} onClose={closeToast} title={toast?.title} detail={toast?.detail} />
    </div>
  )
}
