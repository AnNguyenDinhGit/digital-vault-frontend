import { Activity, Plus, ShieldCheck } from 'lucide-react'
import { Button, Form } from 'react-bootstrap'

const COMING_SOON = 'Sắp ra mắt'
const STATUS_LABELS = { Active: 'Đang hoạt động' }

// Banner đầu trang: thông tin kho đang chọn, bộ chọn kho (khi có từ 2 kho) và các nút hành động
export default function VaultBanner({ vault, vaults, onSelectVault, onAddAsset, onCreateVault }) {
  return (
    <section className="av-panel av-banner" aria-label="Thông tin kho">
      <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
        <span className="av-icon-tile">
          <ShieldCheck size={20} aria-hidden="true" />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="av-modal-tag av-mono-tag">KHO DI SẢN ĐANG ĐƯỢC BẢO VỆ</span>
            <span className="font-mono fs-10 text-slate-400">VAULT #{vault.vaultId}</span>
          </div>
          <h1 className="mt-1 mb-0 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
            {vault.name}
          </h1>
          <p className="mt-1 mb-0 fs-12 text-slate-500">
            Trạng thái kho: <strong className="text-ink">{STATUS_LABELS[vault.status] ?? vault.status}</strong>
            {vault.description ? ` · ${vault.description}` : ''}
          </p>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2">
        {vaults.length >= 2 && (
          <Form.Select
            size="sm"
            aria-label="Chọn kho"
            value={vault.vaultId}
            onChange={(event) => onSelectVault(Number(event.target.value))}
            style={{ width: 'auto', maxWidth: 220 }}
          >
            {vaults.map((item) => (
              <option key={item.vaultId} value={item.vaultId}>
                {item.name}
              </option>
            ))}
          </Form.Select>
        )}
        <button type="button" onClick={onCreateVault} className="av-link-btn fs-12">
          Tạo kho mới
        </button>
        <button type="button" disabled title={COMING_SOON} className="av-ghost-btn is-brand">
          <Activity size={14} aria-hidden="true" />
          Điểm danh ngay
        </button>
        <Button type="button" variant="primary" onClick={onAddAsset} className="av-btn av-btn-sm">
          <Plus size={16} aria-hidden="true" />
          Thêm tài sản mới
        </Button>
      </div>
    </section>
  )
}
