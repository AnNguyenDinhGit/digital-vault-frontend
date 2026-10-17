import { Mail, MapPin, Phone, Scale, UserCog } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Alert, Button, Form } from 'react-bootstrap'
import { assignExecutor, revokeExecutor } from '../../callapi/ownerApi'
import AppToast from '../../components/common/AppToast'
import MockNotice from '../../components/common/MockNotice'
import ExecutorLegalModal from '../../components/owner/ExecutorLegalModal'
import ExecutorPickerModal from '../../components/owner/ExecutorPickerModal'
import RevokeExecutorModal from '../../components/owner/RevokeExecutorModal'
import { useExecutorOverview } from '../../hooks/useExecutorOverview'
import { useVaultExecutor } from '../../hooks/useVaultExecutor'
import { MOCK_MODE } from '../../mocks/mode'
import { countVaultAssets, executorBadgeClass, executorStatusLabel } from '../../utils/executor'
import { formatDate } from '../../utils/proofOfLife'

function ExecutorCard({ executor, assetCount, onChange, onRevoke, onLegal }) {
  return (
    <section className="av-panel d-flex flex-column gap-3" aria-label="Người thi hành hiện tại">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div className="d-flex align-items-start gap-3" style={{ minWidth: 0 }}>
          <span className="av-avatar">{executor.fullName.replace(/^LS\.\s*/, '').slice(0, 1).toUpperCase()}</span>
          <div style={{ minWidth: 0 }}>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 17 }}>
                {executor.fullName}
              </h2>
              <span className={`av-badge ${executorBadgeClass(executor.status)}`}>{executorStatusLabel(executor.status)}</span>
            </div>
            <p className="mb-0 fs-13 text-slate-500">{executor.organization}</p>
            <p className="mb-0 font-mono fs-11 text-slate-400">{`Thẻ LS: ${executor.licenseNumber}`}</p>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button type="button" variant="light" className="av-btn av-btn-sm border" onClick={onLegal}>
            <Scale size={14} aria-hidden="true" />
            Xem hồ sơ pháp lý
          </Button>
          <Button type="button" variant="light" className="av-btn av-btn-sm border" onClick={onChange}>
            Đổi người thi hành
          </Button>
          <Button type="button" variant="light" className="av-btn av-btn-sm border text-danger" onClick={onRevoke}>
            Thu hồi ủy quyền
          </Button>
        </div>
      </div>

      <dl className="row g-2 mb-0 fs-13">
        <div className="col-12 col-md-6 d-flex align-items-center gap-2">
          <Mail size={14} aria-hidden="true" className="text-slate-400" />
          <dd className="mb-0">{executor.email}</dd>
        </div>
        <div className="col-12 col-md-6 d-flex align-items-center gap-2">
          <Phone size={14} aria-hidden="true" className="text-slate-400" />
          <dd className="mb-0">{executor.hotline}</dd>
        </div>
        <div className="col-12 d-flex align-items-center gap-2">
          <MapPin size={14} aria-hidden="true" className="text-slate-400" />
          <dd className="mb-0">{executor.address}</dd>
        </div>
      </dl>

      <div className="av-info-box d-flex flex-wrap gap-4 fs-12 text-slate-600">
        <span>{`Hợp đồng: ${executor.contractNumber}`}</span>
        <span>{`Ủy quyền ngày: ${formatDate(executor.assignedAt)}`}</span>
        {assetCount !== null && <span>{`Phạm vi: ${assetCount} tài sản`}</span>}
      </div>

    </section>
  )
}

function VaultExecutor({ vault, assetCount, proofOfLife, mockMode, notify }) {
  const { status, data: executor, error, reload, apply } = useVaultExecutor(vault.vaultId)
  const [dialog, setDialog] = useState(null)
  const closeDialog = () => setDialog(null)

  const handleAssign = async (executorId) => {
    const result = await assignExecutor(vault.vaultId, executorId)
    apply(result)
    setDialog(null)
    notify({ title: 'Đã gán người thi hành', detail: `${result.fullName} là Executor của kho này.` })
  }

  const handleRevoke = async () => {
    await revokeExecutor(vault.vaultId)
    apply(null)
    setDialog(null)
    notify({ title: 'Đã thu hồi ủy quyền', detail: 'Kho này hiện chưa có người thi hành.' })
  }

  if (status === 'loading') {
    return (
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang tải người thi hành của kho...
      </p>
    )
  }

  if (status === 'error') {
    return (
      <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3">
        <span>{error}</span>
        <Button type="button" variant="light" size="sm" className="border" onClick={reload}>
          Thử lại
        </Button>
      </Alert>
    )
  }

  return (
    <>
      {executor ? (
        <ExecutorCard
          executor={executor}
          assetCount={assetCount}
          onChange={() => setDialog('pick')}
          onRevoke={() => setDialog('revoke')}
          onLegal={() => setDialog('legal')}
        />
      ) : (
        <section className="av-panel av-empty" aria-label="Chưa có người thi hành">
          <p className="mb-3">Kho này chưa có người thi hành.</p>
          <Button type="button" variant="primary" className="av-btn av-btn-sm" onClick={() => setDialog('pick')}>
            Chọn người thi hành
          </Button>
        </section>
      )}

      {dialog === 'pick' && (
        <ExecutorPickerModal currentExecutorId={executor?.executorId} mockMode={mockMode} onConfirm={handleAssign} onClose={closeDialog} />
      )}
      {dialog === 'revoke' && executor && <RevokeExecutorModal executor={executor} onConfirm={handleRevoke} onClose={closeDialog} />}
      {dialog === 'legal' && executor && (
        <ExecutorLegalModal executor={executor} assetCount={assetCount} proofOfLife={proofOfLife} onClose={closeDialog} />
      )}
    </>
  )
}

// Trang "Người thi hành (Executor)": gán, đổi, thu hồi Executor cho từng kho và xem hồ sơ pháp lý
export default function ExecutorManagementPage({ mockMode = MOCK_MODE }) {
  const { status, error, vaults, assetCount, proofOfLife, reload } = useExecutorOverview()
  const [selectedVaultId, setSelectedVaultId] = useState(null)
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  if (status === 'loading') {
    return (
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang tải thông tin người thi hành...
      </p>
    )
  }

  if (status === 'error') {
    return (
      <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3">
        <span>{error}</span>
        <Button type="button" variant="light" size="sm" className="border" onClick={reload}>
          Thử lại
        </Button>
      </Alert>
    )
  }

  const vault = vaults.find((item) => item.vaultId === selectedVaultId) ?? vaults[0] ?? null

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <UserCog size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Người thi hành (Executor)
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Người được bạn ủy quyền thực hiện bàn giao kho di sản số.</p>
          </div>
        </div>
        {vaults.length > 1 && (
          <Form.Select
            aria-label="Chọn kho"
            value={vault.vaultId}
            onChange={(event) => setSelectedVaultId(Number(event.target.value))}
            style={{ maxWidth: 320 }}
          >
            {vaults.map((item) => (
              <option key={item.vaultId} value={item.vaultId}>
                {item.name}
              </option>
            ))}
          </Form.Select>
        )}
      </section>

      <MockNotice
        mode={mockMode}
        message={
          mockMode === 'hybrid'
            ? 'Chỉ thao tác gán hoặc đổi Executor được gửi lên máy chủ; thông tin hiển thị, hồ sơ pháp lý và thu hồi là dữ liệu mô phỏng.'
            : undefined
        }
      />

      {vault ? (
        <VaultExecutor
          key={vault.vaultId}
          vault={vault}
          assetCount={countVaultAssets(assetCount, vaults.length)}
          proofOfLife={proofOfLife}
          mockMode={mockMode}
          notify={setToast}
        />
      ) : (
        <p className="av-notice">Bạn cần có ít nhất một kho để gán người thi hành.</p>
      )}

      <section className="av-panel" aria-labelledby="executor-process-title">
        <h2 id="executor-process-title" className="mb-2 fw-bold text-ink" style={{ fontSize: 16 }}>
          Quy trình thi hành bàn giao
        </h2>
        <ol className="mb-0 fs-13 text-slate-600" style={{ lineHeight: 1.7 }}>
          <li>Bạn chọn một Executor đang hoạt động để ủy quyền cho kho; việc gán có hiệu lực ngay.</li>
          <li>Khi điểm danh sự sống quá hạn và hết ân hạn, Executor được thông báo để bắt đầu bàn giao.</li>
          <li>Executor nộp giấy chứng tử, người xác minh pháp lý kiểm tra trước khi tài sản được mở cho người thụ hưởng.</li>
        </ol>
        <p className="mt-3 mb-0 fs-12 text-slate-500">
          Bạn luôn giữ toàn quyền hủy bỏ hoặc thay thế Executor trước khi bàn giao được kích hoạt.
        </p>
      </section>

      <AppToast show={Boolean(toast)} onClose={closeToast} title={toast?.title} detail={toast?.detail} />
    </div>
  )
}
