import {
  CircleCheck,
  Clock,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  Pencil,
  Percent,
  Phone,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from 'react-bootstrap'
import './ownerAssets.css'
import './ownerBeneficiaries.css'

// ─────────────────────────────────────────────
// Cấu hình tĩnh
// ─────────────────────────────────────────────
const RELATIONS = ['Vợ / Chồng', 'Con', 'Cha / Mẹ', 'Anh / Chị / Em', 'Người thân khác', 'Bạn bè', 'Tổ chức']

const STATUS_META = {
  verified: { label: 'ĐÃ XÁC MINH', badge: 'av-badge-green', icon: <CircleCheck size={10} /> },
  pending: { label: 'CHỜ CHẤP NHẬN', badge: 'av-badge-orange', icon: <Clock size={10} /> },
  unverified: { label: 'CHƯA KYC', badge: 'av-badge-gray', icon: <TriangleAlert size={10} /> },
}

// Bảng màu cho avatar & thanh phân bổ (lặp lại theo thứ tự)
const PALETTE = ['#008779', '#2563eb', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d']

const PROCESS_STEPS = [
  { title: 'Mời & xác thực liên hệ', desc: 'Gửi lời mời qua email, người nhận xác nhận OTP.' },
  { title: 'Định danh VNeID / KYC', desc: 'Đối chiếu CCCD với CSDL quốc gia về dân cư.' },
  { title: 'Kích hoạt điều kiện thừa kế', desc: 'Chủ sở hữu bỏ lỡ điểm danh, Executor mở hồ sơ.' },
  { title: 'Thẩm định pháp lý', desc: 'Công chứng viên xác thực giấy chứng tử & di chúc.' },
  { title: 'Bàn giao khóa giải mã', desc: 'Khóa Shamir được tái tạo, giải mã E2EE trên thiết bị.' },
]

const EMPTY_FORM = {
  name: '',
  relation: RELATIONS[0],
  email: '',
  phone: '',
  idNumber: '',
  share: '',
  message: '',
  verifyMethod: 'email',
}

const getInitials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

const maskPhone = (phone) => (phone.length > 4 ? `${phone.slice(0, 3)}•••${phone.slice(-3)}` : phone)

// Lưu tạm danh sách vào localStorage cho tới khi có API (tránh mất dữ liệu khi reload / chuyển trang)
const STORAGE_KEY = 'av_owner_beneficiaries'

const loadBeneficiaries = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// crypto.randomUUID chỉ có trong secure context (https / localhost) → dùng id dự phòng khi truy cập qua http IP LAN
const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `bnf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// ─────────────────────────────────────────────
// Modal Thêm / Sửa người thụ hưởng
// ─────────────────────────────────────────────
function BeneficiaryModal({ show, onHide, onSave, initial, remainingShare }) {
  const isEdit = Boolean(initial)
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const [error, setError] = useState('')

  // Tỷ lệ tối đa còn được phép gán cho người này
  const maxShare = remainingShare + (initial ? Number(initial.share) : 0)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const share = Number(form.share)
    if (!Number.isFinite(share) || share <= 0) {
      setError('Tỷ lệ phân bổ phải lớn hơn 0%.')
      return
    }
    if (share > maxShare) {
      setError(`Tổng tỷ lệ vượt quá 100%. Bạn chỉ còn có thể phân bổ tối đa ${maxShare}%.`)
      return
    }
    // TODO: Kết nối API POST/PUT /owner/beneficiaries khi BE sẵn sàng
    onSave({ ...form, share })
  }

  return (
    <Modal show={show} onHide={onHide} centered className="av-asset-modal">
      <form onSubmit={handleSubmit} noValidate={false}>
        {/* Header */}
        <div className="d-flex align-items-start justify-content-between p-4 border-bottom">
          <div className="d-flex align-items-center gap-3">
            <span className="av-icon-tile" style={{ width: 40, height: 40, borderRadius: 10 }}>
              {isEdit ? <Pencil size={18} /> : <UserPlus size={18} />}
            </span>
            <div>
              <p className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
                {isEdit ? 'Cập Nhật Người Thụ Hưởng' : 'Chỉ Định Người Thụ Hưởng Mới'}
              </p>
              <p className="mb-0 fs-12 text-slate-500">
                Thông tin định danh được mã hóa E2EE và chỉ giải mã khi quy trình bàn giao được kích hoạt
              </p>
            </div>
          </div>
          <button type="button" onClick={onHide} className="av-close-btn" aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 d-flex flex-column gap-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* 1. Thông tin cơ bản */}
          <div>
            <p className="av-bnf-step-title">1. Thông tin người thụ hưởng</p>
            <div className="av-bnf-form-grid">
              <div className="av-bnf-span-2">
                <label className="av-label mb-1" htmlFor="bnf-name">
                  Họ và tên (theo CCCD) <span className="text-danger">*</span>
                </label>
                <input
                  id="bnf-name"
                  name="name"
                  className="av-input form-control"
                  placeholder="Nguyễn Văn An"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="av-label mb-1" htmlFor="bnf-relation">
                  Mối quan hệ <span className="text-danger">*</span>
                </label>
                <select
                  id="bnf-relation"
                  name="relation"
                  className="av-input form-control form-select"
                  value={form.relation}
                  onChange={handleChange}
                >
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="av-label mb-1" htmlFor="bnf-id">
                  Số CCCD / Định danh
                </label>
                <input
                  id="bnf-id"
                  name="idNumber"
                  className="av-input form-control font-mono"
                  placeholder="0012 •••• ••••"
                  inputMode="numeric"
                  maxLength={12}
                  value={form.idNumber}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="av-label mb-1" htmlFor="bnf-email">
                  Email nhận thông báo <span className="text-danger">*</span>
                </label>
                <input
                  id="bnf-email"
                  name="email"
                  type="email"
                  className="av-input form-control"
                  placeholder="an.nguyen@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="av-label mb-1" htmlFor="bnf-phone">
                  Số điện thoại
                </label>
                <input
                  id="bnf-phone"
                  name="phone"
                  type="tel"
                  className="av-input form-control"
                  placeholder="0912 345 678"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* 2. Tỷ lệ phân bổ */}
          <div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <p className="av-bnf-step-title mb-0">2. Tỷ lệ phân bổ di sản</p>
              <span className="av-badge av-badge-teal" style={{ fontSize: 9 }}>
                CÒN LẠI: {maxShare}%
              </span>
            </div>
            <div className="av-bnf-share-input">
              <input
                id="bnf-share"
                name="share"
                type="number"
                min={1}
                max={100}
                className="av-input form-control"
                placeholder="25"
                value={form.share}
                onChange={handleChange}
                required
              />
              <span className="av-bnf-share-suffix">
                <Percent size={14} />
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={maxShare}
              value={Number(form.share) || 0}
              onChange={(e) => setForm((p) => ({ ...p, share: e.target.value }))}
              className="av-bnf-range mt-2"
              aria-label="Kéo để chọn tỷ lệ phân bổ"
            />
            {error && <p className="av-error">{error}</p>}
          </div>

          {/* 3. Xác thực */}
          <div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <p className="av-bnf-step-title mb-0">3. Phương thức xác thực khi nhận di sản</p>
              <span className="av-badge av-badge-blue" style={{ fontSize: 9 }}>
                Chuẩn eKYC
              </span>
            </div>
            <div className="av-verify-radio">
              <label className={`av-verify-option${form.verifyMethod === 'email' ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="verifyMethod"
                  value="email"
                  checked={form.verifyMethod === 'email'}
                  onChange={handleChange}
                />
                <div>
                  <p className="mb-0 fs-12 fw-semibold text-ink d-flex align-items-center gap-1">
                    <Mail size={12} /> Email OTP + Mật khẩu
                  </p>
                  <p className="mb-0 fs-11 text-slate-500">Phù hợp với người nhận ở nước ngoài</p>
                </div>
              </label>
              <label className={`av-verify-option${form.verifyMethod === 'vneid' ? ' active' : ''}`}>
                <input
                  type="radio"
                  name="verifyMethod"
                  value="vneid"
                  checked={form.verifyMethod === 'vneid'}
                  onChange={handleChange}
                />
                <div>
                  <p className="mb-0 fs-12 fw-semibold text-ink d-flex align-items-center gap-1">
                    <Fingerprint size={12} /> Định danh VNeID mức 2
                  </p>
                  <p className="mb-0 fs-11 text-slate-500">Bảo mật cao nhất, đối chiếu CSDL dân cư</p>
                </div>
              </label>
            </div>
          </div>

          {/* 4. Lời nhắn */}
          <div>
            <label className="av-label mb-1" htmlFor="bnf-message">
              Lời nhắn gửi kèm (tùy chọn)
            </label>
            <textarea
              id="bnf-message"
              name="message"
              className="av-input form-control"
              style={{ height: 80, resize: 'none', paddingTop: 10, paddingBottom: 10 }}
              placeholder="Lời nhắn này chỉ được giải mã và hiển thị khi di sản được bàn giao..."
              value={form.message}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="d-flex align-items-center justify-content-between px-4 py-3 border-top"
          style={{ background: 'var(--av-slate-50)' }}
        >
          <span className="av-modal-security-note">
            <Lock size={12} />
            {isEdit ? 'Thay đổi sẽ được ghi vào Audit Log' : 'Lời mời sẽ được gửi qua email đã nhập'}
          </span>
          <div className="d-flex gap-2">
            <button type="button" onClick={onHide} className="av-action-btn">
              Hủy bỏ
            </button>
            <button type="submit" className="av-action-btn av-action-btn-primary">
              {isEdit ? <ShieldCheck size={14} /> : <Send size={14} />}
              {isEdit ? 'Lưu thay đổi' : 'Lưu & Gửi lời mời'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// Modal xác nhận xóa
// ─────────────────────────────────────────────
function ConfirmRemoveModal({ target, onHide, onConfirm }) {
  return (
    <Modal show={Boolean(target)} onHide={onHide} centered className="av-asset-modal av-bnf-confirm">
      <div className="p-4 text-center">
        <span className="av-denied-icon mb-3">
          <Trash2 size={20} />
        </span>
        <p className="mb-1 fw-bold text-ink" style={{ fontSize: 16 }}>
          Thu hồi quyền thụ hưởng?
        </p>
        <p className="mb-0 fs-13 text-slate-500">
          <strong className="text-ink">{target?.name}</strong> sẽ mất toàn bộ quyền nhận{' '}
          <strong className="text-ink">{target?.share}%</strong> di sản. Thao tác này được lưu vết kiểm toán.
        </p>
      </div>
      <div className="d-flex gap-2 px-4 pb-4">
        <button type="button" className="av-action-btn flex-fill justify-content-center" onClick={onHide}>
          Hủy bỏ
        </button>
        <button type="button" className="av-action-btn av-bnf-danger-btn flex-fill justify-content-center" onClick={onConfirm}>
          <Trash2 size={13} />
          Thu hồi quyền
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// Màn hình chính: Người thụ hưởng
// ─────────────────────────────────────────────
export default function OwnerBeneficiariesPage() {
  // TODO: Thay bằng dữ liệu từ API GET /owner/beneficiaries
  // const [beneficiaries, setBeneficiaries] = useState([])
  const [beneficiaries, setBeneficiaries] = useState(loadBeneficiaries)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [modal, setModal] = useState({ show: false, editing: null })
  const [removeTarget, setRemoveTarget] = useState(null)

  // Đồng bộ danh sách xuống localStorage mỗi khi thay đổi
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(beneficiaries))
  }, [beneficiaries])

  const totalShare = beneficiaries.reduce((sum, b) => sum + b.share, 0)
  const remainingShare = 100 - totalShare
  const countBy = (status) => beneficiaries.filter((b) => b.status === status).length

  const filterTabs = [
    { id: 'all', label: 'Tất cả', count: beneficiaries.length },
    { id: 'verified', label: 'Đã xác minh', count: countBy('verified') },
    { id: 'pending', label: 'Chờ chấp nhận', count: countBy('pending') },
    { id: 'unverified', label: 'Chưa KYC', count: countBy('unverified') },
  ]

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return beneficiaries.filter((b) => {
      if (activeFilter !== 'all' && b.status !== activeFilter) return false
      if (!q) return true
      return [b.name, b.email, b.phone, b.relation].some((v) => v?.toLowerCase().includes(q))
    })
  }, [beneficiaries, search, activeFilter])

  const openAdd = () => setModal({ show: true, editing: null })
  const openEdit = (b) => setModal({ show: true, editing: b })
  const closeModal = () => setModal({ show: false, editing: null })

  const handleSave = (data) => {
    if (modal.editing) {
      setBeneficiaries((list) => list.map((b) => (b.id === modal.editing.id ? { ...b, ...data } : b)))
    } else {
      setBeneficiaries((list) => [
        ...list,
        // { ...data, id: crypto.randomUUID(), status: 'pending', assets: 0, color: PALETTE[list.length % PALETTE.length] },
        { ...data, id: createId(), status: 'pending', assets: 0, color: PALETTE[list.length % PALETTE.length] },
      ])
    }
    closeModal()
  }

  const handleRemove = () => {
    // TODO: Kết nối API DELETE /owner/beneficiaries/:id
    setBeneficiaries((list) => list.filter((b) => b.id !== removeTarget.id))
    setRemoveTarget(null)
  }

  return (
    <>
      <div className="d-flex flex-column gap-4">
        {/* Banner */}
        <div className="av-vault-banner">
          <div className="d-flex align-items-center gap-3">
            <span className="av-icon-tile" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <Users size={20} />
            </span>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="av-badge av-badge-teal" style={{ fontSize: 9 }}>
                  <span className="av-pill-dot" style={{ width: 5, height: 5 }} />
                  PERMISSION MAPPING
                </span>
                <span className="font-mono text-slate-400" style={{ fontSize: 10 }}>
                  ZERO-KNOWLEDGE · SHAMIR 3/5
                </span>
              </div>
              <h1 className="mb-0 fw-bold text-ink" style={{ fontSize: 17 }}>
                Người Thụ Hưởng &amp; Phân Quyền Thừa Kế
              </h1>
              <p className="mb-0 fs-12 text-slate-500">
                Chỉ định người nhận di sản số, tỷ lệ phân bổ và phương thức xác thực khi quy trình bàn giao được kích hoạt.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="av-action-btn av-action-btn-primary"
            onClick={openAdd}
            disabled={remainingShare <= 0}
            id="btn-add-beneficiary"
          >
            <UserPlus size={14} />
            Thêm người thụ hưởng
          </button>
        </div>

        {/* Thống kê */}
        <div className="av-stat-grid">
          <div className="av-stat-card">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Users size={15} className="text-slate-400" />
              <span className="av-stat-label">TỔNG NGƯỜI THỤ HƯỞNG</span>
            </div>
            <p className="av-stat-value mb-1">{String(beneficiaries.length).padStart(2, '0')}</p>
            <p className="mb-0 fs-11 text-slate-400">người</p>
            <p className="mb-0 fs-11 text-slate-500 mt-1">Tối đa 10 người / kho</p>
          </div>

          <div className="av-stat-card">
            <div className="d-flex align-items-center gap-2 mb-2">
              <UserCheck size={15} className="text-slate-400" />
              <span className="av-stat-label">ĐÃ XÁC MINH DANH TÍNH</span>
            </div>
            <p className="av-stat-value mb-1">
              {countBy('verified')}/{beneficiaries.length}
            </p>
            <p className="mb-0 fs-11 text-slate-400">hợp lệ</p>
            <p className="mb-0 fs-11 text-brand mt-1">
              <ShieldCheck size={10} /> Đối chiếu VNeID
            </p>
          </div>

          <div className="av-stat-card">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Clock size={15} className="text-slate-400" />
              <span className="av-stat-label">CHỜ CHẤP NHẬN</span>
            </div>
            <p className="av-stat-value mb-1">{String(countBy('pending')).padStart(2, '0')}</p>
            <p className="mb-0 fs-11 text-slate-400">lời mời</p>
            <p className="mb-0 fs-11 text-slate-500 mt-1">Hết hạn sau 7 ngày</p>
          </div>

          <div className="av-stat-card">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Percent size={15} className="text-slate-400" />
              <span className="av-stat-label">TỶ LỆ ĐÃ PHÂN BỔ</span>
            </div>
            <p className="av-stat-value mb-1">{totalShare}%</p>
            <div className="av-bnf-mini-bar mt-2">
              <span style={{ width: `${totalShare}%` }} />
            </div>
            <p className="mb-0 fs-11 text-slate-500 mt-1">Còn lại {remainingShare}% chưa chỉ định</p>
          </div>
        </div>

        {/* Nội dung chính: danh sách + panel phụ */}
        <div className="av-bnf-layout">
          {/* Danh sách */}
          <section className="av-assets-table-wrapper" aria-labelledby="bnf-list-title">
            <div className="av-assets-table-header">
              <div>
                <h2 id="bnf-list-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 15 }}>
                  Danh Sách Người Thụ Hưởng
                </h2>
                <p className="mb-0 fs-12 text-slate-500">
                  Thông tin liên hệ được mã hóa, chỉ hiển thị dạng che giấu
                </p>
              </div>
              <button type="button" className="av-icon-btn" title="Làm mới">
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="av-assets-search" style={{ maxWidth: 'none' }}>
                <Search size={14} className="av-assets-search-icon" />
                <input
                  id="bnf-search"
                  type="text"
                  placeholder="Tìm theo tên, email, số điện thoại hoặc mối quan hệ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="av-filter-tabs">
              {filterTabs.map((tab) => (
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

            {beneficiaries.length === 0 ? (
              <div className="av-empty-state">
                <span className="av-icon-tile mb-4" style={{ width: 56, height: 56, borderRadius: 14 }}>
                  <UserPlus size={24} />
                </span>
                <p className="mb-1 fw-bold text-ink" style={{ fontSize: 15 }}>
                  Chưa có người thụ hưởng nào
                </p>
                <p className="mb-4 fs-13 text-slate-500" style={{ maxWidth: 400 }}>
                  Chỉ định người thân sẽ nhận di sản số của bạn. Họ chỉ có thể truy cập tài sản sau khi quy trình
                  thẩm định pháp lý hoàn tất.
                </p>
                <button type="button" className="av-action-btn av-action-btn-primary" onClick={openAdd}>
                  <UserPlus size={14} />
                  Thêm người thụ hưởng đầu tiên
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="av-empty-state">
                <Search size={22} className="text-slate-400 mb-3" />
                <p className="mb-0 fs-13 text-slate-500">Không tìm thấy người thụ hưởng phù hợp.</p>
              </div>
            ) : (
              <ul className="av-bnf-list">
                {visible.map((b) => {
                  const status = STATUS_META[b.status]
                  return (
                    <li key={b.id} className="av-asset-row">
                      <span className="av-bnf-avatar" style={{ '--c': b.color }}>
                        {getInitials(b.name)}
                      </span>

                      <div className="av-asset-meta">
                        <div className="d-flex align-items-center gap-2">
                          <p className="av-asset-name">{b.name}</p>
                          <span className="av-badge av-badge-gray">{b.relation}</span>
                        </div>
                        <p className="av-asset-desc d-flex align-items-center gap-3">
                          <span className="d-inline-flex align-items-center gap-1">
                            <Mail size={11} /> {b.email}
                          </span>
                          {b.phone && (
                            <span className="d-inline-flex align-items-center gap-1 font-mono">
                              <Phone size={11} /> {maskPhone(b.phone)}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="av-bnf-share">
                        <div className="d-flex justify-content-between">
                          <span className="fs-11 text-slate-400">Phân bổ</span>
                          <span className="fs-12 fw-bold text-ink">{b.share}%</span>
                        </div>
                        <div className="av-bnf-mini-bar">
                          <span style={{ width: `${b.share}%`, background: b.color }} />
                        </div>
                      </div>

                      <span className={`av-badge ${status.badge}`}>
                        {status.icon}
                        {status.label}
                      </span>

                      <div className="av-asset-actions">
                        {b.status === 'pending' && (
                          <button type="button" className="av-icon-btn" title="Gửi lại lời mời">
                            <Send size={14} />
                          </button>
                        )}
                        <button type="button" className="av-icon-btn" title="Chỉnh sửa" onClick={() => openEdit(b)}>
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="av-icon-btn av-bnf-icon-danger"
                          title="Thu hồi quyền"
                          onClick={() => setRemoveTarget(b)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <div
              className="d-flex align-items-center px-4 py-2 border-top"
              style={{ background: 'var(--av-slate-50)' }}
            >
              <p className="mb-0 fs-11 text-slate-400 d-flex align-items-center gap-1">
                <Lock size={10} />
                Mọi thay đổi quyền thụ hưởng được ký số và lưu vết tại Audit Log.
              </p>
            </div>
          </section>

          {/* Panel phụ */}
          <aside className="d-flex flex-column gap-4">
            {/* Phân bổ di sản */}
            <div className="av-stat-card">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <p className="mb-0 fw-bold text-ink fs-14">Cơ cấu phân bổ</p>
                <span className={`av-badge ${totalShare === 100 ? 'av-badge-green' : 'av-badge-orange'}`}>
                  {totalShare === 100 ? 'HOÀN TẤT' : 'CHƯA ĐỦ 100%'}
                </span>
              </div>

              <div className="av-bnf-stack-bar">
                {beneficiaries.map((b) => (
                  <span key={b.id} style={{ width: `${b.share}%`, background: b.color }} title={`${b.name}: ${b.share}%`} />
                ))}
              </div>

              <ul className="av-bnf-legend">
                {beneficiaries.map((b) => (
                  <li key={b.id}>
                    <span className="av-bnf-dot" style={{ background: b.color }} />
                    <span className="flex-grow-1 text-truncate">{b.name}</span>
                    <span className="fw-semibold text-ink">{b.share}%</span>
                  </li>
                ))}
                {remainingShare > 0 && (
                  <li>
                    <span className="av-bnf-dot" style={{ background: 'var(--av-slate-200)' }} />
                    <span className="flex-grow-1 text-slate-400">Chưa chỉ định</span>
                    <span className="fw-semibold text-slate-400">{remainingShare}%</span>
                  </li>
                )}
              </ul>

              {remainingShare > 0 && (
                <p className="av-bnf-hint">
                  <TriangleAlert size={12} />
                  Phần chưa chỉ định sẽ được xử lý theo pháp luật thừa kế hiện hành.
                </p>
              )}
            </div>

            {/* Quy trình nhận di sản */}
            <div className="av-stat-card">
              <div className="d-flex align-items-center gap-2 mb-3">
                <KeyRound size={15} className="text-brand" />
                <p className="mb-0 fw-bold text-ink fs-14">Quy trình nhận di sản</p>
              </div>
              <ol className="av-bnf-steps">
                {PROCESS_STEPS.map((s, i) => (
                  <li key={s.title}>
                    <span className="av-bnf-step-num">{i + 1}</span>
                    <div>
                      <p className="mb-0 fs-12 fw-semibold text-ink">{s.title}</p>
                      <p className="mb-0 fs-11 text-slate-500">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="av-info-box d-flex gap-2">
              <Shield size={16} className="text-brand flex-shrink-0 mt-1" />
              <p className="mb-0 fs-12 text-slate-600">
                Người thụ hưởng <strong>không thể xem</strong> nội dung tài sản khi bạn còn hoạt động. Khóa giải mã chỉ
                được tái tạo sau khi đủ ngưỡng xác nhận.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* key đảm bảo form được reset mỗi lần mở */}
      {modal.show && (
        <BeneficiaryModal
          key={modal.editing?.id ?? 'new'}
          show={modal.show}
          onHide={closeModal}
          onSave={handleSave}
          initial={modal.editing}
          remainingShare={remainingShare}
        />
      )}
      <ConfirmRemoveModal target={removeTarget} onHide={() => setRemoveTarget(null)} onConfirm={handleRemove} />
    </>
  )
}
