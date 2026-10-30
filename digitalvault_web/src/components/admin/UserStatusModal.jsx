import { ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { updateUserStatus } from '../../callapi/adminApi'
import { adminErrorMessage, USER_STATUSES, userStatusInfo } from '../../utils/admin'

// Mô tả ngắn cho từng trạng thái để Admin biết hệ quả trước khi đổi
const STATUS_HINTS = {
  Active: 'Tài khoản đăng nhập và sử dụng hệ thống bình thường.',
  Disabled: 'Vô hiệu hóa tài khoản: người dùng không thể đăng nhập cho tới khi được kích hoạt lại.',
  Locked: 'Tạm khóa tài khoản: người dùng không thể đăng nhập cho tới khi được mở khóa.',
}

const BADGE_CLASS = { ok: 'av-badge-ok', warn: 'av-badge-warn', muted: 'av-badge-muted' }

// Hộp thoại Admin cập nhật trạng thái tài khoản (Active, Disabled, Locked) qua PUT /admin/users/{id}/status
export default function UserStatusModal({ user, isSelf, onClose, onSaved }) {
  const [status, setStatus] = useState(user.status)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const changed = status !== user.status
  const losesAccess = isSelf && changed && status !== 'Active'

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!changed) return
    setBusy(true)
    setError('')
    try {
      await updateUserStatus(user.userId, status)
      onSaved(status)
    } catch (caught) {
      setBusy(false)
      setError(adminErrorMessage(caught))
    }
  }

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="user-status-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="user-status-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
              Cập Nhật Trạng Thái Tài Khoản
            </h2>
            <p className="mb-0 fs-12 text-slate-500">{`${user.fullName} · ${user.email}`}</p>
          </div>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="av-modal-body d-flex flex-column gap-3">
          <fieldset className="d-flex flex-column gap-2">
            <legend className="av-label mb-1">Trạng thái tài khoản</legend>
            {USER_STATUSES.map((value) => {
              const info = userStatusInfo(value)
              return (
                <label
                  key={value}
                  htmlFor={`user-status-${value}`}
                  className={`av-info-box d-flex align-items-start gap-3 mb-0${status === value ? ' border-primary' : ''}`}
                  style={{ cursor: busy ? 'default' : 'pointer' }}
                >
                  <Form.Check
                    type="radio"
                    id={`user-status-${value}`}
                    name="user-status"
                    className="mt-1"
                    aria-label={info.text}
                    checked={status === value}
                    disabled={busy}
                    onChange={() => setStatus(value)}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span className="d-flex flex-wrap align-items-center gap-2">
                      <span className={`av-badge ${BADGE_CLASS[info.tone]}`}>{info.text}</span>
                      {value === user.status && <span className="fs-11 text-slate-500">Hiện tại</span>}
                    </span>
                    <span className="d-block fs-12 text-slate-600 mt-1">{STATUS_HINTS[value]}</span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          {losesAccess && (
            <Alert variant="warning" className="av-alert mb-0">
              Đây là tài khoản của bạn. Đổi sang trạng thái này sẽ khiến bạn mất quyền truy cập trang quản trị.
            </Alert>
          )}
          {error && <Alert variant="danger" className="av-alert mb-0">{error}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !changed} className="av-btn av-btn-md">
            {busy ? 'Đang lưu...' : 'Cập nhật trạng thái'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
