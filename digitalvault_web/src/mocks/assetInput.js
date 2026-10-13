import { hasUnknownFields, isBlank } from './helpers'

// Kiểm tra body sửa tài sản như khi tạo (trừ vaultId không được đổi); trả { error } hoặc { value }
export function parseAssetUpdate(body) {
  if (hasUnknownFields(body, ['name', 'type', 'description'])) return { error: 'Request contains fields outside the contract.' }
  if (isBlank(body?.name) || body.name.trim().length > 100) return { error: 'Name is required (max 100).' }
  // AssetType là varchar(50) nên BE chỉ nhận ký tự ASCII in được
  if (typeof body.type !== 'string' || !/^[\x20-\x7E]{1,50}$/.test(body.type)) return { error: 'Type must be 1-50 ASCII characters.' }
  const description = body.description ?? null
  if (description !== null && (typeof description !== 'string' || description.length > 4000)) {
    return { error: 'Description is too long (max 4000).' }
  }
  return { value: { name: body.name.trim(), type: body.type, description: description && description.trim() ? description : null } }
}
