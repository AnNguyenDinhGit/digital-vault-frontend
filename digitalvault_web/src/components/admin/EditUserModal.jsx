import { ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { updateUserRoles } from '../../callapi/adminApi'
import { adminErrorMessage, ALL_ROLES, roleLabel } from '../../utils/admin'

// Hộp thoại Admin đổi vai trò của một người dùng (trạng thái tài khoản có hộp thoại riêng: UserStatusModal)
export default function EditUserModal({ user, isSelf, onClose, onSaved }) {
  const [roles, setRoles] = useState(user.roles)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const rolesChanged = roles.length !== user.roles.length || roles.some((role) => !user.roles.includes(role))

  const toggleRole = (role) => setRoles((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]))

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (roles.length === 0) {
      setError('Chọn ít nhất một vai trò.')
      return
    }
    if (!rolesChanged) return
    setBusy(true)
    setError('')
    try {
      await updateUserRoles(user.userId, roles)
      onSaved()
    } catch (caught) {
      setBusy(false)
      setError(adminErrorMessage(caught))
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="edit-user-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="edit-user-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Phân Quyền Người Dùng
            </h2>
            <p className="mb-0 fs-12 text-slate-500">{`${user.fullName} · ${user.email}`}</p>
          </div>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-4">
          {isSelf && (
            <Alert variant="warning" className="av-alert mb-0">
              Đây là tài khoản của bạn. Bỏ vai trò Quản trị viên sẽ khiến bạn mất quyền truy cập trang này.
            </Alert>
          )}
          <fieldset>
            <legend className="av-label mb-2">Vai trò</legend>
            <div className="d-flex flex-wrap gap-3">
              {ALL_ROLES.map((role) => (
                <Form.Check
                  key={role}
                  type="checkbox"
                  id={`edit-role-${role}`}
                  label={roleLabel(role)}
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                />
              ))}
            </div>
          </fieldset>
          {error && <Alert variant="danger" className="av-alert mb-0">{error}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !rolesChanged} className="av-btn av-btn-md">
            {busy ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
