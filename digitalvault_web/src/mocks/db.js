import { USER_STORAGE_KEY } from '../contexts/authContextInstance'

// Cơ sở dữ liệu giả trong bộ nhớ cho MSW, bám theo DTO của BE (xem docs/API.md bên repo BE)
const DB_STORAGE_KEY = 'aeterna.mock.db'
const SESSION_STORAGE_KEY = 'aeterna.mock.session'

// Tài khoản demo để đăng nhập khi chạy mock
export const DEMO_ACCOUNT = {
  userId: 1,
  fullName: 'Nguyễn Văn An',
  email: 'owner@example.com',
  password: 'Owner@123456',
}

// Mỗi role còn lại có một tài khoản demo riêng để thử phân quyền (mật khẩu dùng chung với tài khoản Owner)
export const ROLE_ACCOUNTS = [
  { userId: 5, role: 'Executor', fullName: 'LS. Lê Hoàng Nam', email: 'executor@example.com', password: DEMO_ACCOUNT.password },
  { userId: 6, role: 'LegalVerifier', fullName: 'CCV. Nguyễn Văn Cường', email: 'verifier@example.com', password: DEMO_ACCOUNT.password },
  { userId: 7, role: 'Beneficiary', fullName: 'Nguyễn Văn An', email: 'beneficiary@example.com', password: DEMO_ACCOUNT.password },
  { userId: 8, role: 'Admin', fullName: 'Quản trị viên hệ thống', email: 'admin@example.com', password: DEMO_ACCOUNT.password },
]

// Tăng số này mỗi khi đổi cấu trúc dữ liệu seed để bỏ dữ liệu cũ đang lưu trong trình duyệt
const DB_VERSION = 16

// hybrid: gọi BE thật cho API đã có, chỉ mock API BE chưa có, nên phiên đăng nhập là của BE thật
const config = { latencyMs: 0, hybrid: false }

export function setMockHybrid(flag) {
  config.hybrid = flag
}

export function isMockHybrid() {
  return config.hybrid
}

export function setMockLatency(ms) {
  config.latencyMs = ms
}

export function getMockLatency() {
  return config.latencyMs
}

// Owner endpoint của BE không tính chữ ký nên signatureValid luôn là null
function doc(documentId, fileName, fileType) {
  return { documentId, fileName, fileType, isEncrypted: true, signatureValid: null }
}

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

// Dữ liệu khởi tạo: 1 chủ sở hữu demo, 2 người thụ hưởng đã đăng ký, 1 kho và 6 tài sản
function createSeed() {
  return {
    version: DB_VERSION,
    nextIds: { user: 9, vault: 2, asset: 7, document: 20, log: 13, contract: 2, assignment: 7, handover: 1, handoverCase: 1, verification: 1 },
    users: [
      {
        userId: 1,
        fullName: DEMO_ACCOUNT.fullName,
        email: DEMO_ACCOUNT.email,
        phone: '0901234567',
        identityNumber: '079094004521',
        password: DEMO_ACCOUNT.password,
        roles: ['Owner'],
      },
      { userId: 2, fullName: 'Trần Bảo Long', email: 'long.tran@example.com', password: 'Owner@123456', roles: ['Owner', 'Beneficiary'] },
      { userId: 3, fullName: 'Nguyễn Thị Mai', email: 'mai.nguyen@example.com', password: 'Owner@123456', roles: ['Owner', 'Beneficiary'] },
      { userId: 4, fullName: 'Lê Minh Quân', email: 'quan.le@example.com', password: 'Owner@123456', roles: ['Owner'] },
      ...ROLE_ACCOUNTS.map(({ userId, fullName, email, password, role }) => ({ userId, fullName, email, password, roles: [role] })),
    ],
    vaults: [
      {
        vaultId: 1,
        ownerId: 1,
        name: 'Kho Tài Sản Số & Phân Quyền Thừa Kế Cá Nhân',
        description: 'Kho lưu trữ tài sản số và giấy tờ pháp lý của gia đình.',
        status: 'Active',
      },
    ],
    assets: [
      {
        assetId: 1,
        vaultId: 1,
        name: 'Ví Lạnh Trữ Crypto (BTC & ETH Portfolio - 3.4 BTC)',
        type: 'CryptoWallet',
        description: 'Bao gồm Seed Phrase 24 ký tự và khóa phụ phanh Shamir. Địa chỉ ví: 0x71C...4942.',
        status: 'Active',
        documents: [],
      },
      {
        assetId: 2,
        vaultId: 1,
        name: 'Tài Khoản Tiết Kiệm Số Vietcombank Priority',
        type: 'BankAccount',
        description: 'Số tài khoản có hợp đồng tiền gửi đính kèm để xác thực công chứng.',
        status: 'Active',
        documents: [doc(11, 'SoTietKiem_Signed.pdf', 'application/pdf')],
      },
      {
        assetId: 3,
        vaultId: 1,
        name: 'Kho Lưu Trữ Kỷ Niệm Gia Đình & Thư Di Nguyện',
        type: 'Document',
        description: 'Kho nén 4.2GB hình ảnh gia đình, video nhắn nhủ và tài liệu bản quyền di chúc số.',
        status: 'Active',
        documents: [
          doc(12, 'ThuDiNguyen.pdf', 'application/pdf'),
          doc(13, 'AnhGiaDinh.png', 'image/png'),
        ],
      },
      {
        assetId: 4,
        vaultId: 1,
        name: 'Tài Khoản Kênh YouTube & Fanpage Doanh Nghiệp',
        type: 'SocialAccount',
        description: 'Tài khoản quản trị viên chính kèm mã dự phòng 2FA. Cần giấy phép kinh doanh ủy quyền số.',
        status: 'Active',
        documents: [],
      },
      {
        assetId: 5,
        vaultId: 1,
        name: 'Tài Khoản Chứng Khoán SSI',
        type: 'BankAccount',
        description: 'Danh mục cổ phiếu và trái phiếu doanh nghiệp.',
        status: 'Active',
        documents: [doc(14, 'SSI_HopDong.pdf', 'application/pdf')],
      },
      {
        assetId: 6,
        vaultId: 1,
        name: 'Ví Phần Cứng Ledger Dự Phòng',
        type: 'CryptoWallet',
        description: 'Ví phần cứng lưu trong két sắt ngân hàng.',
        status: 'Active',
        documents: [],
      },
    ],
    // Điểm danh sự sống theo userId; chủ sở hữu demo đã cấu hình và điểm danh lần cuối 10 ngày trước
    proofOfLife: {
      1: { frequencyDays: 30, gracePeriodDays: 7, lastPingAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), missedCount: 0 },
    },
    // Hồ sơ bàn giao do Executor xử lý: { requestId, vaultId, executorId, status, initiatedAt, documents, assetDocuments, cases }
    // Mặc định chưa có hồ sơ nào để mỗi test và mỗi kịch bản tự tạo hồ sơ cần dùng (hồ sơ mẫu cũ gắn vào kho 1 làm khóa kho demo)
    handovers: [],
    // Quên mật khẩu: mã OTP đang chờ xác nhận theo email, và mã đặt lại (reset token) đã được xác nhận
    passwordResets: {},
    // Refresh token đang lưu hành (như bảng RefreshTokens của BE): token -> { userId, revoked }
    refreshTokens: {},
    // Mã xác thực hai lớp đang chờ nhập, theo challengeId: { userId, code, expiresAt, attempts, lastSentAt }
    twoFactorChallenges: {},
    resetTokens: {},
    // Chỉnh sửa hồ sơ theo userId (tên, số điện thoại); phủ lên dữ liệu gốc, dùng được cả khi tài khoản nằm ở BE thật
    profiles: {},
    // Cài đặt bảo mật theo userId; thiếu thì coi như chưa bật 2FA và chưa từng đổi mật khẩu
    security: { 1: { twoFactorEnabled: false, passwordChangedAt: hoursAgo(24 * 45) } },
    // Hồ sơ các Executor (luật sư/công chứng viên) có thể được ủy quyền
    executors: [
      { executorId: 5, fullName: 'LS. Lê Hoàng Nam', organization: 'Văn phòng Luật sư Trí Minh', licenseNumber: 'EX-9021', email: 'hoangnam@trimin.example', hotline: '0901 234 567', address: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh' },
      { executorId: 21, fullName: 'LS. Trần Đăng Khoa', organization: 'Công ty Luật Đại Việt', licenseNumber: 'EX-8832', email: 'dangkhoa@daiviet.example', hotline: '0912 345 678', address: '45 Lê Lợi, Quận Hải Châu, Đà Nẵng' },
      { executorId: 22, fullName: 'LS. Nguyễn Hải Yến', organization: 'Văn phòng Luật sư Hải Yến', licenseNumber: 'EX-9104', email: 'haiyen@haiyen.example', hotline: '0933 456 789', address: '88 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội' },
    ],
    // Người thi hành của từng kho (theo vaultId); kho demo đã có Executor đang hiệu lực
    executorAssignments: {
      1: { executorId: 5, status: 'Active', assignedAt: hoursAgo(24 * 20), contractNumber: 'HD-UQ-2026-0001' },
    },
    // Nhật ký hoạt động (cột theo bảng AuditLog của BE) của chủ sở hữu demo
    activityLogs: [
      { logId: 1, userId: 1, action: 'Login', entityType: 'User', entityId: 1, timestamp: hoursAgo(2), ipAddress: '14.161.42.90', result: 'Success' },
      { logId: 2, userId: 1, action: 'CreateVault', entityType: 'DigitalVault', entityId: 1, timestamp: hoursAgo(50), ipAddress: '14.161.42.90', result: 'Success' },
      { logId: 3, userId: 1, action: 'CreateAsset', entityType: 'DigitalAsset', entityId: 1, timestamp: hoursAgo(49), ipAddress: '14.161.42.90', result: 'Success' },
      { logId: 4, userId: 1, action: 'CreateAsset', entityType: 'DigitalAsset', entityId: 2, timestamp: hoursAgo(48), ipAddress: '14.161.42.90', result: 'Success' },
      { logId: 5, userId: 1, action: 'AssignBeneficiary', entityType: 'DigitalAsset', entityId: 1, timestamp: hoursAgo(47), ipAddress: '14.161.42.90', result: 'Success' },
      { logId: 6, userId: 1, action: 'AssignBeneficiary', entityType: 'DigitalAsset', entityId: 1, timestamp: hoursAgo(46), ipAddress: '14.161.42.90', result: 'Success' },
      { logId: 7, userId: 1, action: 'UploadAssetDocument', entityType: 'DigitalAsset', entityId: 2, timestamp: hoursAgo(30), ipAddress: '14.161.42.90', result: 'Alive_Signed' },
      { logId: 8, userId: 1, action: 'UploadAssetDocument', entityType: 'DigitalAsset', entityId: 3, timestamp: hoursAgo(28), ipAddress: '14.161.42.90', result: 'Pending_Legal' },
      { logId: 9, userId: 1, action: 'Login', entityType: 'User', entityId: 1, timestamp: hoursAgo(100), ipAddress: '113.190.234.12', result: 'Failed' },
      { logId: 10, userId: 1, action: 'UpdateProofOfLife', entityType: null, entityId: null, timestamp: hoursAgo(250), ipAddress: '14.161.42.90', result: 'Success' },
      { logId: 11, userId: 1, action: 'PingProofOfLife', entityType: null, entityId: null, timestamp: hoursAgo(240), ipAddress: '14.161.42.90', result: 'Success' },
      { logId: 12, userId: 1, action: 'Logout', entityType: null, entityId: null, timestamp: hoursAgo(200), ipAddress: '14.161.42.90', result: 'Success' },
    ],
    assignments: [
      { assignmentId: 1, assetId: 1, beneficiaryId: 2, allocation: 40, status: 'Active' },
      { assignmentId: 2, assetId: 1, beneficiaryId: 3, allocation: 60, status: 'Active' },
      { assignmentId: 3, assetId: 2, beneficiaryId: 3, allocation: 100, status: 'Active' },
      { assignmentId: 4, assetId: 3, beneficiaryId: 2, allocation: 50, status: 'Active' },
      { assignmentId: 5, assetId: 3, beneficiaryId: 3, allocation: 50, status: 'Active' },
      { assignmentId: 6, assetId: 5, beneficiaryId: 2, allocation: 100, status: 'Active' },
    ],
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    const stored = raw ? JSON.parse(raw) : null
    // Dữ liệu lưu từ phiên bản cũ thiếu tài khoản mới nên bỏ đi để seed lại
    return stored?.version === DB_VERSION ? stored : null
  } catch {
    return null
  }
}

let state = loadState() ?? createSeed()

export function getDb() {
  return state
}

// Lưu lại để dữ liệu mock còn sau khi F5 (bỏ qua nếu trình duyệt chặn storage)
export function saveDb() {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
}

export function resetMockDb() {
  state = createSeed()
  try {
    localStorage.removeItem(DB_STORAGE_KEY)
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
  config.latencyMs = 0
  config.hybrid = false
}

export function nextId(kind) {
  const id = state.nextIds[kind]
  state.nextIds[kind] += 1
  return id
}

// Ở chế độ hỗn hợp người dùng đăng nhập vào BE thật, FE đã lưu userId và email đó trong sessionStorage nên mock dùng lại
function readFrontendUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_STORAGE_KEY))
  } catch {
    return null
  }
}

function readFrontendUserId() {
  const user = readFrontendUser()
  return Number.isInteger(user?.userId) ? user.userId : null
}

// Email mà FE đã lưu khi đăng nhập, dùng cho tài khoản chỉ có ở BE thật
export function getFrontendEmail() {
  const email = readFrontendUser()?.email
  return typeof email === 'string' ? email : ''
}

// Phiên đăng nhập giả: lưu userId trong sessionStorage để F5 không mất phiên, đóng tab thì mất
export function getSessionUserId() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (raw) return Number(raw)
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
  return config.hybrid ? readFrontendUserId() : null
}

export function setSessionUserId(userId) {
  try {
    if (userId === null) sessionStorage.removeItem(SESSION_STORAGE_KEY)
    else sessionStorage.setItem(SESSION_STORAGE_KEY, String(userId))
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
}
