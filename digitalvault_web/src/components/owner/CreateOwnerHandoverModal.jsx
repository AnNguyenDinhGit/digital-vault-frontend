import { ClipboardList, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal } from 'react-bootstrap'
import { assignExecutor, createOwnerHandover, getExecutors, getVaults } from '../../callapi/ownerApi'
import { MOCK_MODE } from '../../mocks/mode'
import { executorErrorMessage } from '../../utils/executor'
import { ownerCreateHandoverErrorMessage } from '../../utils/handover'

// Hộp thoại Owner tạo hồ sơ bàn giao cho một kho đang hoạt động, có thể chọn Executor; chỉ mount khi mở.
// BE chưa cho kèm Executor trong lệnh tạo hồ sơ nên chọn xong thì gán trước rồi mới tạo; để trống thì BE dùng người đã gán hoặc tự chọn.
export default function CreateOwnerHandoverModal({ mockMode = MOCK_MODE, onClose, onCreated }) {
  const [vaultsState, setVaultsState] = useState({ status: 'loading', vaults: [] })
  const [vaultId, setVaultId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [executorId, setExecutorId] = useState('')
  const [executors, setExecutors] = useState({ key: null, status: 'loading', items: [] })
  // Executor đã gán trong hộp thoại này (theo kho:người) để bấm Tạo lại sau lỗi không gán và gửi thông báo lần nữa
  const assignedRef = useRef(null)
  // Chế độ hỗn hợp có danh sách mô phỏng không khớp tài khoản thật nên không cho chọn
  const canChooseExecutor = mockMode !== 'hybrid'

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

  useEffect(() => {
    if (!canChooseExecutor || !vaultId) return undefined
    let cancelled = false
    getExecutors({ vaultId: Number(vaultId) })
      .then((items) => {
        if (!cancelled) setExecutors({ key: vaultId, status: 'ready', items })
      })
      .catch(() => {
        if (!cancelled) setExecutors({ key: vaultId, status: 'error', items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [canChooseExecutor, vaultId])

  const handleClose = () => {
    if (!busy) onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    const assignKey = `${vaultId}:${executorId}`
    if (executorId && assignedRef.current !== assignKey) {
      try {
        await assignExecutor(Number(vaultId), Number(executorId))
        assignedRef.current = assignKey
      } catch (caught) {
        setBusy(false)
        setError(executorErrorMessage(caught))
        return
      }
    }
    try {
      onCreated(await createOwnerHandover(Number(vaultId)))
    } catch (caught) {
      setBusy(false)
      const assignedNote = assignedRef.current === assignKey && executorId ? ' Người thi hành bạn chọn đã được gán cho kho; sau khi xử lý lỗi, bấm Tạo hồ sơ lại.' : ''
      setError(`${ownerCreateHandoverErrorMessage(caught)}${assignedNote}`)
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
                <Form.Select
                  id="handover-vault"
                  value={vaultId}
                  onChange={(event) => {
                    setVaultId(event.target.value)
                    setExecutorId('')
                  }}
                >
                  {vaults.map((vault) => (
                    <option key={vault.vaultId} value={vault.vaultId}>
                      {vault.name}
                    </option>
                  ))}
                </Form.Select>
              </div>
              {canChooseExecutor && (
                <div>
                  <label htmlFor="handover-executor" className="av-label mb-2">
                    Người thi hành
                  </label>
                  <Form.Select id="handover-executor" value={executorId} disabled={busy} onChange={(event) => setExecutorId(event.target.value)}>
                    <option value="">Để hệ thống tự chọn</option>
                    {executors.key === vaultId &&
                      executors.items.map((item) => (
                        <option key={item.executorId} value={item.executorId}>
                          {item.fullName}
                        </option>
                      ))}
                  </Form.Select>
                  {executors.key === vaultId && executors.status === 'error' && (
                    <p className="mt-2 mb-0 fs-12 text-slate-500">Không tải được danh sách người thi hành, hệ thống sẽ tự chọn.</p>
                  )}
                  <p className="mt-2 mb-0 fs-12 text-slate-500">Nếu kho đã có người thi hành và bạn không chọn, hệ thống dùng người đó. Người thi hành sẽ nhận thông báo và phải tiếp nhận hồ sơ.</p>
                </div>
              )}
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
