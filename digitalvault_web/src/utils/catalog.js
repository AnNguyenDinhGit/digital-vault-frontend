// Nhãn hiển thị cho AssetType; BE không ràng buộc enum nên type lạ sẽ hiện nguyên giá trị
export const ASSET_TYPE_LABELS = {
  CryptoWallet: 'Crypto',
  BankAccount: 'Ngân hàng',
  SocialAccount: 'MXH & Tài khoản',
  Document: 'Tài liệu số',
  Other: 'Khác',
}

export const PAGE_SIZE_OPTIONS = [4, 8, 12]

export function assetTypeLabel(type) {
  return ASSET_TYPE_LABELS[type] ?? type
}

const TYPE_CODES = { CryptoWallet: 'CRYPTO', BankAccount: 'BANK', Document: 'DOC', SocialAccount: 'SOC', Other: 'OTHER' }

// Mã hiển thị suy ra từ type và id (BE không có trường mã tài sản)
export function assetCode(asset) {
  const code = TYPE_CODES[asset.type] ?? asset.type.slice(0, 6).toUpperCase()
  return `#AST-${code}-${String(asset.assetId).padStart(2, '0')}`
}

export function formatAllocation(allocation) {
  return `${Number(allocation)}%`
}

// Chữ cái đầu hiển thị trong avatar: hai từ cuối của họ tên (Trần Bảo Long -> BL)
export function getInitials(fullName) {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const letters = words.length === 1 ? Array.from(words[0]).slice(0, 2) : words.slice(-2).map((word) => Array.from(word)[0])
  return letters.join('').toLocaleUpperCase('vi')
}

const FILE_TYPE_LABELS = { 'application/pdf': 'PDF', 'image/png': 'PNG', 'image/jpeg': 'JPEG', 'text/plain': 'TXT' }

// Nhãn ngắn cho loại file thay vì hiện nguyên MIME type
export function fileTypeLabel(mimeType) {
  if (!mimeType) return 'FILE'
  const known = FILE_TYPE_LABELS[mimeType]
  if (known) return known
  const subtype = mimeType.split('/')[1]
  return subtype ? subtype.replace(/^x-/, '').toUpperCase() : 'FILE'
}

// Dung lượng file dạng dễ đọc: 512 B, 1,5 KB, 2,4 MB
export function formatFileSize(bytes) {
  const oneDecimal = (value) => value.toFixed(1).replace('.', ',').replace(/,0$/, '')
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${oneDecimal(bytes / 1024)} KB`
  return `${oneDecimal(bytes / (1024 * 1024))} MB`
}

// Gắn danh sách người thụ hưởng vào từng tài sản (không sửa dữ liệu gốc)
export function attachBeneficiaries(assets, beneficiaries) {
  return assets.map((asset) => ({
    ...asset,
    beneficiaries: beneficiaries.filter((b) => b.assetId === asset.assetId),
  }))
}

// Gom danh sách phân bổ theo từng người thụ hưởng: người X hưởng những tài sản nào, bao nhiêu %
export function groupBeneficiariesByPerson(assets, beneficiaries) {
  const assetNames = new Map(assets.map((asset) => [asset.assetId, asset.name]))
  const people = new Map()
  beneficiaries.forEach((b) => {
    if (!people.has(b.beneficiaryId)) {
      people.set(b.beneficiaryId, { beneficiaryId: b.beneficiaryId, fullName: b.fullName, items: [] })
    }
    people.get(b.beneficiaryId).items.push({
      assetId: b.assetId,
      assetName: assetNames.get(b.assetId) ?? `Tài sản #${b.assetId}`,
      allocation: b.allocation,
      status: b.status,
    })
  })
  return [...people.values()]
    .map((person) => ({ ...person, totalAssets: person.items.length }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'))
}

// Tìm người thụ hưởng theo tên hoặc tên tài sản họ được hưởng (không phân biệt dấu)
export function filterPeople(people, query) {
  const needle = normalizeText(query.trim())
  if (!needle) return people
  return people.filter(
    (person) =>
      normalizeText(person.fullName).includes(needle) ||
      person.items.some((item) => normalizeText(item.assetName).includes(needle)),
  )
}

// Tài sản còn phần trăm chưa phân bổ, kèm số đã phân bổ và còn lại
export function getAssignableAssets(assets) {
  return assets
    .map((asset) => {
      const allocated = Math.round(asset.beneficiaries.reduce((sum, b) => sum + b.allocation, 0) * 100) / 100
      return { ...asset, allocated, remaining: Math.round((100 - allocated) * 100) / 100 }
    })
    .filter((asset) => asset.remaining > 0)
}

// Số liệu cho 3 thẻ thống kê, chỉ tính từ dữ liệu BE thật có
export function buildStats(assets, beneficiaries) {
  const documents = assets.flatMap((asset) => asset.documents)
  return {
    totalAssets: assets.length,
    beneficiaryCount: new Set(beneficiaries.map((b) => b.beneficiaryId)).size,
    documentedCount: assets.filter((asset) => asset.documents.length > 0).length,
    missingDocumentCount: assets.filter((asset) => asset.documents.length === 0).length,
    encryptedPercent:
      documents.length === 0 ? null : Math.round((documents.filter((d) => d.isEncrypted).length / documents.length) * 100),
  }
}

// Tab lọc: "Tất cả" trước, rồi các type đã biết theo thứ tự cố định, cuối cùng là type lạ
export function getTypeTabs(assets) {
  const counts = new Map()
  assets.forEach((asset) => counts.set(asset.type, (counts.get(asset.type) ?? 0) + 1))
  const knownKeys = Object.keys(ASSET_TYPE_LABELS).filter((key) => counts.has(key))
  const unknownKeys = [...counts.keys()].filter((key) => !(key in ASSET_TYPE_LABELS))
  return [
    { key: 'all', label: 'Tất cả', count: assets.length },
    ...[...knownKeys, ...unknownKeys].map((key) => ({ key, label: assetTypeLabel(key), count: counts.get(key) })),
  ]
}

// Bỏ dấu và hạ chữ thường để tìm kiếm tiếng Việt không phụ thuộc cách gõ
export function normalizeText(value) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
}

// Lọc phía FE vì BE chưa có tìm kiếm/lọc. Tìm theo tên, mô tả và tên người thụ hưởng
export function filterAssets(assets, { query, type }) {
  const needle = normalizeText(query.trim())
  return assets.filter((asset) => {
    if (type !== 'all' && asset.type !== type) return false
    if (!needle) return true
    const haystack = [asset.name, asset.description, ...asset.beneficiaries.map((b) => b.fullName)]
    return haystack.some((text) => normalizeText(text).includes(needle))
  })
}

// Phân trang phía FE vì BE chưa phân trang; trang vượt giới hạn được đưa về trang hợp lệ gần nhất
export function paginate(items, page, pageSize) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    totalPages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  }
}
