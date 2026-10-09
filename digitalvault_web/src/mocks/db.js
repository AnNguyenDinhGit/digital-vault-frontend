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

const config = { latencyMs: 0 }

export function setMockLatency(ms) {
  config.latencyMs = ms
}

export function getMockLatency() {
  return config.latencyMs
}

function doc(documentId, fileName, fileType, signatureValid) {
  return { documentId, fileName, fileType, isEncrypted: true, signatureValid }
}

// Dữ liệu khởi tạo: 1 chủ sở hữu demo, 2 người thụ hưởng đã đăng ký, 1 kho và 6 tài sản
function createSeed() {
  return {
    nextIds: { user: 5, vault: 2, asset: 7, document: 20 },
    users: [
      { userId: 1, fullName: DEMO_ACCOUNT.fullName, email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, roles: ['Owner'] },
      { userId: 2, fullName: 'Trần Bảo Long', email: 'long.tran@example.com', password: 'Owner@123456', roles: ['Owner'] },
      { userId: 3, fullName: 'Nguyễn Thị Mai', email: 'mai.nguyen@example.com', password: 'Owner@123456', roles: ['Owner'] },
      { userId: 4, fullName: 'Lê Minh Quân', email: 'quan.le@example.com', password: 'Owner@123456', roles: ['Owner'] },
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
        documents: [doc(11, 'SoTietKiem_Signed.pdf', 'application/pdf', true)],
      },
      {
        assetId: 3,
        vaultId: 1,
        name: 'Kho Lưu Trữ Kỷ Niệm Gia Đình & Thư Di Nguyện',
        type: 'Document',
        description: 'Kho nén 4.2GB hình ảnh gia đình, video nhắn nhủ và tài liệu bản quyền di chúc số.',
        status: 'Active',
        documents: [
          doc(12, 'ThuDiNguyen.pdf', 'application/pdf', true),
          doc(13, 'AnhGiaDinh.png', 'image/png', false),
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
        documents: [doc(14, 'SSI_HopDong.pdf', 'application/pdf', true)],
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
    assignments: [
      { assetId: 1, beneficiaryId: 2, allocation: 40, status: 'Active' },
      { assetId: 1, beneficiaryId: 3, allocation: 60, status: 'Active' },
      { assetId: 2, beneficiaryId: 3, allocation: 100, status: 'Active' },
      { assetId: 3, beneficiaryId: 2, allocation: 50, status: 'Active' },
      { assetId: 3, beneficiaryId: 3, allocation: 50, status: 'Active' },
      { assetId: 5, beneficiaryId: 2, allocation: 100, status: 'Active' },
    ],
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
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
}

export function nextId(kind) {
  const id = state.nextIds[kind]
  state.nextIds[kind] += 1
  return id
}

// Phiên đăng nhập giả: lưu userId trong sessionStorage để F5 không mất phiên, đóng tab thì mất
export function getSessionUserId() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

export function setSessionUserId(userId) {
  try {
    if (userId === null) sessionStorage.removeItem(SESSION_STORAGE_KEY)
    else sessionStorage.setItem(SESSION_STORAGE_KEY, String(userId))
  } catch {
    // Bỏ qua khi trình duyệt chặn storage
  }
}
