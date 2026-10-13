import {
  Bitcoin,
  Building2,
  Eye,
  FileText,
  FolderLock,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Upload,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Modal } from 'react-bootstrap'
import './ownerAssets.css'

// ─────────────────────────────────────────────
// Dữ liệu mẫu (placeholder – chưa có API)
// ─────────────────────────────────────────────
const MOCK_STATS = {
  total: 0,
  beneficiaries: 0,
  verified: '0/0',
  executor: '–',
}

const ASSET_TYPES = [
  { id: 'Crypto', label: 'Ví Crypto', icon: <Bitcoin size={16} /> },
  { id: 'Bank', label: 'Ngân hàng', icon: <Building2 size={16} /> },
  { id: 'Account', label: 'Tài khoản/MXH', icon: <User size={16} /> },
  { id: 'Document', label: 'Tài liệu số', icon: <FileText size={16} /> },
]

const FILTER_TABS = [
  { id: 'all', label: 'Tất cả', count: 0 },
  { id: 'Crypto', label: 'Crypto', count: 0 },
  { id: 'Bank', label: 'Ngân hàng', count: 0 },
  { id: 'Account', label: 'MXH & Tài khoản', count: 0 },
  { id: 'Document', label: 'Tài liệu số', count: 0 },
]

// ─────────────────────────────────────────────
// Modal Thêm Tài Sản
// ─────────────────────────────────────────────
function AddAssetModal({ show, onHide }) {
  const fileRef = useRef(null)
  const [assetType, setAssetType] = useState('Crypto')
  const [verifyMethod, setVerifyMethod] = useState('digital')
  const [form, setForm] = useState({
    name: '',
    secret: '',
    beneficiary: '',
    executor: '',
  })
  const [fileName, setFileName] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setFileName(file.name)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) setFileName(file.name)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: Kết nối API POST /owner/assets khi BE sẵn sàng
    onHide()
  }

  return (
    <Modal show={show} onHide={onHide} centered className="av-asset-modal">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between p-4 border-bottom">
          <div className="d-flex align-items-center gap-3">
            <span className="av-icon-tile" style={{ width: 40, height: 40, borderRadius: 10 }}>
              <Plus size={18} />
            </span>
            <div>
              <p className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
                Thêm Tài Sản Số Vào Kho Bảo Mật
              </p>
              <p className="mb-0 fs-12 text-slate-500">Dữ liệu sẽ được mã hóa đầu cuối E2EE (AES-256) trước khi lưu trữ</p>
            </div>
          </div>
          <button type="button" onClick={onHide} className="av-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 d-flex flex-column gap-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* 1. Phân loại */}
          <div>
            <p className="mb-2 fs-13 fw-semibold text-ink">
              1. Phân loại tài sản số <span className="text-danger">*</span>
            </p>
            <div className="av-asset-type-grid">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`av-asset-type-btn${assetType === t.id ? ' active' : ''}`}
                  onClick={() => setAssetType(t.id)}
                >
                  <span className="av-type-icon">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Tên tài sản */}
          <div>
            <label className="av-label mb-1" htmlFor="asset-name">
              2. Tên gọi nhớ tài sản <span className="text-danger">*</span>
            </label>
            <input
              id="asset-name"
              name="name"
              className="av-input form-control"
              placeholder="Ví Lạnh Ledger Backup 02 (ETH & SOL)"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* 3. Nội dung bảo mật */}
          <div>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="av-label" htmlFor="asset-secret">
                Nội dung bảo mật (Seed Phrase / Khóa Private / Passphrase) <span className="text-danger">*</span>
              </label>
              <span className="av-badge av-badge-teal" style={{ fontSize: 9 }}>
                <Lock size={9} /> AES-256 CLIENT-SIDE ENCRYPTED
              </span>
            </div>
            <textarea
              id="asset-secret"
              name="secret"
              className="av-input form-control"
              style={{ height: 90, resize: 'none', paddingTop: 10, paddingBottom: 10 }}
              placeholder="alpha battery candle direct echo flame galaxy hero icon jelly..."
              value={form.secret}
              onChange={handleChange}
              required
            />
          </div>

          {/* 4. Hình thức xác minh & Bàn giao */}
          <div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <p className="mb-0 fs-13 fw-semibold text-ink">3. Hình thức xác minh &amp; Bàn giao</p>
              <span className="av-badge av-badge-blue" style={{ fontSize: 9 }}>Chuẩn Di chúc điện tử</span>
            </div>
            <div className="av-verify-radio">
              <label className={`av-verify-option${verifyMethod === 'digital' ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="verifyMethod"
                  value="digital"
                  checked={verifyMethod === 'digital'}
                  onChange={() => setVerifyMethod('digital')}
                />
                <div>
                  <p className="mb-0 fs-12 fw-semibold text-ink">Ký chữ ký số điện tử</p>
                  <p className="mb-0 fs-11 text-slate-500">Dành cho người bàn giao có sổng ký qua SmartCA / Token</p>
                </div>
              </label>
              <label className={`av-verify-option${verifyMethod === 'pdf' ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="verifyMethod"
                  value="pdf"
                  checked={verifyMethod === 'pdf'}
                  onChange={() => setVerifyMethod('pdf')}
                />
                <div>
                  <p className="mb-0 fs-12 fw-semibold text-ink">Tải giấy tờ chứng từ PDF</p>
                  <p className="mb-0 fs-11 text-slate-500">Mã hóa và lưu Blob Storage an toàn</p>
                </div>
              </label>
            </div>
          </div>

          {/* Upload */}
          <div
            className="av-upload-zone"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.png" className="d-none" onChange={handleFileChange} />
            <Upload size={20} className="text-slate-400" />
            {fileName ? (
              <p className="mb-0 fs-12 fw-semibold text-brand">{fileName}</p>
            ) : (
              <>
                <p className="mb-0 fs-12 fw-semibold text-ink">
                  Kéo thả giấy tờ chứng minh số hữu (.PDF) hoặc{' '}
                  <span className="text-brand">Duyệt file</span>
                </p>
                <p className="mb-0 fs-11 text-slate-500">Hỗ trợ tới 25MB. File được mã hóa trước khi lên Blob Storage.</p>
              </>
            )}
          </div>

          {/* Người thụ hưởng & Executor */}
          <div className="d-flex gap-3">
            <div className="flex-grow-1">
              <label className="av-label mb-1" htmlFor="asset-beneficiary">
                Người thụ hưởng (Permission Mapping)
              </label>
              <input
                id="asset-beneficiary"
                name="beneficiary"
                className="av-input form-control av-input-sm"
                placeholder="Chọn người thụ hưởng..."
                value={form.beneficiary}
                onChange={handleChange}
              />
            </div>
            <div className="flex-grow-1">
              <label className="av-label mb-1" htmlFor="asset-executor">
                Digital Executor phụ trách
              </label>
              <input
                id="asset-executor"
                name="executor"
                className="av-input form-control av-input-sm"
                placeholder="Chọn Executor..."
                value={form.executor}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="d-flex align-items-center justify-content-between px-4 py-3 border-top" style={{ background: 'var(--av-slate-50)' }}>
          <span className="av-modal-security-note">
            <Lock size={12} />
            Khóa mã hóa Zero-Knowledge bảo vệ cấp độ 4
          </span>
          <div className="d-flex gap-2">
            <button type="button" onClick={onHide} className="av-action-btn">
              Hủy bỏ
            </button>
            <button type="submit" className="av-action-btn av-action-btn-primary">
              <ShieldCheck size={14} />
              Mã Hóa &amp; Lưu Tài Sản
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// Màn hình chính: Danh mục tài sản số
// ─────────────────────────────────────────────
export default function OwnerAssetsPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <>
      <div className="d-flex flex-column gap-4">

        {/* Banner Vault */}
        <div className="av-vault-banner">
          <div className="d-flex align-items-center gap-3">
            <span className="av-icon-tile" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <Shield size={20} />
            </span>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="av-badge av-badge-teal" style={{ fontSize: 9 }}>
                  <span className="av-pill-dot" style={{ width: 5, height: 5 }} />
                  KHO DI SẢN ĐANG ĐƯỢC BẢO VỆ
                </span>
                <span className="font-mono text-slate-400" style={{ fontSize: 10 }}>VAULT #VN-0000</span>
              </div>
              <p className="mb-0 fw-bold text-ink" style={{ fontSize: 17 }}>Kho Tài Sản Số &amp; Phân Quyền Thừa Kế Cá Nhân</p>
              <p className="mb-0 fs-12 text-slate-500">
                Trạng thái hoạt động: <span className="fw-semibold text-brand">Khoẻ mạnh &amp; Đã điểm danh.</span>{' '}
                Hạn xác nhận tiếp theo: –
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button type="button" className="av-action-btn">
              <Zap size={13} />
              Điểm danh ngay
            </button>
            <button type="button" className="av-action-btn av-action-btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={14} />
              Thêm tài sản mới
            </button>
          </div>
        </div>

        {/* Thống kê tổng quan */}
        <div className="av-stat-grid">
          <div className="av-stat-card">
            <div className="d-flex align-items-center gap-2 mb-2">
              <FolderLock size={15} className="text-slate-400" />
              <span className="av-stat-label">TỔNG TÀI SẢN SỐ</span>
            </div>
            <p className="av-stat-value mb-1">{MOCK_STATS.total.toString().padStart(2, '0')}</p>
            <p className="mb-0 fs-11 text-slate-400">mục</p>
            <p className="mb-0 fs-11 text-brand mt-1">
              <ShieldCheck size={10} /> 100% đã mã hóa E2EE
            </p>
          </div>

          <div className="av-stat-card">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Users size={15} className="text-slate-400" />
              <span className="av-stat-label">NGƯỜI THỤ HƯỞNG</span>
            </div>
            <p className="av-stat-value mb-1">{MOCK_STATS.beneficiaries.toString().padStart(2, '0')}</p>
            <p className="mb-0 fs-11 text-slate-400">người</p>
            <p className="mb-0 fs-11 text-slate-500 mt-1">Đã khớp Permission Map</p>
          </div>

          <div className="av-stat-card">
            <div className="d-flex align-items-center gap-2 mb-2">
              <FileText size={15} className="text-slate-400" />
              <span className="av-stat-label">XÁC MINH SỞ HỮU</span>
            </div>
            <p className="av-stat-value mb-1">{MOCK_STATS.verified}</p>
            <p className="mb-0 fs-11 text-slate-400">hợp lệ</p>
            <p className="mb-0 fs-11 text-slate-500 mt-1">Đang chờ tải file PDF</p>
          </div>

          <div className="av-stat-card">
            <div className="d-flex align-items-center gap-2 mb-2">
              <KeyRound size={15} className="text-slate-400" />
              <span className="av-stat-label">DIGITAL EXECUTOR</span>
            </div>
            <p className="av-stat-value mb-1" style={{ fontSize: 20 }}>{MOCK_STATS.executor}</p>
            <p className="mb-0 fs-11 text-slate-400">Chưa chỉ định</p>
            <p className="mb-0 fs-11 text-slate-500 mt-1">Chưa liên kết</p>
          </div>
        </div>

        {/* Bảng danh sách */}
        <div className="av-assets-table-wrapper">

          {/* Header bảng */}
          <div className="av-assets-table-header">
            <div>
              <p className="mb-0 fw-bold text-ink" style={{ fontSize: 15 }}>
                Danh Mục Tài Sản Số Trong Kho (E2EE Client-side)
              </p>
              <p className="mb-0 fs-12 text-slate-500">Dữ liệu được giải mã trực tiếp bằng Master Key trên thiết bị của bạn</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="av-badge av-badge-teal" style={{ fontSize: 9 }}>
                <span className="av-pill-dot" style={{ width: 5, height: 5 }} />
                SYNC: REALTIME
              </span>
              <button type="button" className="av-icon-btn" title="Làm mới">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Thanh tìm kiếm */}
          <div className="px-5 py-3 border-bottom">
            <div className="av-assets-search">
              <Search size={14} className="av-assets-search-icon" />
              <input
                type="text"
                placeholder="Tìm kiếm tài sản theo tên, mã hash (#AST-…), địa chỉ ví hoặc người thụ hưởng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs lọc */}
          <div className="av-filter-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`av-filter-tab${activeFilter === tab.id ? ' active' : ''}`}
                onClick={() => setActiveFilter(tab.id)}
              >
                {tab.label}
                <span className="av-tab-count">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Danh sách rỗng */}
          <div className="av-empty-state">
            <span className="av-icon-tile mb-4" style={{ width: 56, height: 56, borderRadius: 14 }}>
              <FolderLock size={24} />
            </span>
            <p className="mb-1 fw-bold text-ink" style={{ fontSize: 15 }}>Kho tài sản đang trống</p>
            <p className="mb-4 fs-13 text-slate-500" style={{ maxWidth: 380 }}>
              Bắt đầu thêm tài sản số đầu tiên vào kho bảo mật của bạn. Toàn bộ dữ liệu được mã hóa AES-256 đầu cuối trước khi lưu trữ.
            </p>
            <button
              type="button"
              className="av-action-btn av-action-btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={14} />
              Thêm tài sản đầu tiên
            </button>
          </div>

          {/* Pagination (hiện placeholder) */}
          <div className="av-pagination">
            <p className="mb-0 fs-12 text-slate-500">Hiển thị 0 trong tổng số 0 tài sản số · Số lượng: 0 tài sản / trang</p>
            <div className="d-flex align-items-center gap-1">
              <button type="button" className="av-page-btn" disabled>
                <Eye size={13} />
              </button>
            </div>
          </div>

          {/* Footer audit */}
          <div className="d-flex align-items-center justify-content-between px-5 py-2 border-top" style={{ background: 'var(--av-slate-50)' }}>
            <p className="mb-0 fs-11 text-slate-400 d-flex align-items-center gap-1">
              <Lock size={10} />
              Mọi chỉnh sửa trong kho sẽ được lưu vết kiểm toán tại Audit Log theo chuẩn Zero-Knowledge.
            </p>
          </div>
        </div>

      </div>

      {/* Modal Thêm Tài Sản */}
      <AddAssetModal show={showAddModal} onHide={() => setShowAddModal(false)} />
    </>
  )
}
