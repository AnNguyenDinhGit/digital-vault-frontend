import { ClipboardList, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { createOwnerHandover, getVaults } from '../../callapi/ownerApi'
import { ownerCreateHandoverErrorMessage } from '../../utils/handover'

// Hộp thoại Owner tạo hồ sơ bàn giao cho một kho đang hoạt động; chỉ mount khi mở
export default function CreateOwnerHandoverModal({ onClose, onCreated }) {
  const [vaultsState, setVaultsState] = useState({ status: 'loading', vaults: [] })
  const [vaultId, setVaultId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getVaults()
      .then((vaults) => {
        if (cancelled) return
        const active = vaults.filter((vault) => vault.status === 'Active')
        setVaultsState({ status: 'ready', vaults: active })
        setVaultId(active[0] ? String(active[0].vaultId) : '')
      })
      .catch(() => {
        if (!cancelled) setVaultsState({ status: 'error', vaults: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onCreated(await createOwnerHandover(Number(vaultId)))
    } catch (caught) {
      setBusy(false)
      setError(ownerCreateHandoverErrorMessage(caught))
    }
  }

  const { status, vaults } = vaultsState

  return (
    <Modal show onHide={handleClose} centered animation={false} dialogClassName="av-modal" aria-labelledby="create-owner-handover-title">
      <div className="av-modal-head">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <ClipboardList size={20} aria-hidden="true" />
          </span>
          <h2 id="create-owner-handover-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 19, letterSpacing: '-0.025em' }}>
            Tạo Hồ Sơ Bàn Giao
          </h2>
        </div>
        <button type="button" onClick={handleClose} aria-label="Đóng" className="av-close-btn">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="av-modal-body d-flex flex-column gap-3">
          {status === 'loading' && (
            <p role="status" className="mb-0 fs-13 text-slate-500">
              Đang tải danh sách kho...
            </p>
          )}
          {status === 'error' && <Alert variant="danger" className="av-alert mb-0">Không tải được danh sách kho. Vui lòng đóng và thử lại.</Alert>}
          {status === 'ready' && vaults.length === 0 && <p className="av-empty mb-0">Bạn chưa có kho nào đang hoạt động.</p>}
          {status === 'ready' && vaults.length > 0 && (
            <>
              <div>
                <label htmlFor="handover-vault" className="av-label mb-2">
                  Kho cần bàn giao
                </label>
                <Form.Select id="handover-vault" value={vaultId} onChange={(event) => setVaultId(event.target.value)}>
                  {vaults.map((vault) => (
                    <option key={vault.vaultId} value={vault.vaultId}>
                      {vault.name}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <p className="mb-0 fs-13 text-slate-600">
                Mỗi tài sản đang hoạt động trong kho cần có giấy tờ và được phân bổ đủ 100% cho người thụ hưởng. Nếu kho chưa có Người thi hành, hệ thống sẽ tự gán một người độc lập.
                Khi hồ sơ tồn tại (chưa hủy), bạn không thể sửa tài sản, phân bổ hay giấy tờ của kho.
              </p>
            </>
          )}
          {error && <Alert variant="danger" className="av-alert mb-0">{error}</Alert>}
        </div>

        <div className="av-modal-foot justify-content-end gap-2">
          <Button type="button" variant="light" onClick={handleClose} disabled={busy} className="av-btn av-btn-md border">
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={busy || status !== 'ready' || vaults.length === 0} className="av-btn av-btn-md">
            {busy ? 'Đang tạo...' : 'Tạo hồ sơ'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
