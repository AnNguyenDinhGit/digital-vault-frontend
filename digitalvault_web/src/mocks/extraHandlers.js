import { http, HttpResponse } from 'msw'
import { computeProofOfLife } from '../utils/proofOfLife'
import { getDb, isMockHybrid, nextId, saveDb } from './db'
import { hasUnknownFields, ownerRoute, problem } from './helpers'

// Các API mà BE chưa có (điểm danh, nhật ký, executor, bảo mật...). Dùng được ở cả chế độ mock đầy đủ lẫn hỗn hợp.

const DAY = 24 * 60 * 60 * 1000
const isIntegerInRange = (value, max) => Number.isInteger(value) && value >= 1 && value <= max

// Trạng thái và hạn tiếp theo luôn được tính lại từ thời gian hiện tại
function proofOfLifeDto(record) {
  const { status, nextPingDue } = computeProofOfLife(record)
  return {
    frequencyDays: record.frequencyDays,
    gracePeriodDays: record.gracePeriodDays,
    lastPingAt: record.lastPingAt,
    nextPingDue,
    status,
    missedCount: record.missedCount,
  }
}

const proofOfLifeHandlers = [
  http.get(
    '*/api/owner/proof-of-life',
    ownerRoute(({ userId }) => {
      const record = getDb().proofOfLife[userId]
      return record ? HttpResponse.json(proofOfLifeDto(record)) : problem(404, 'Proof of life is not configured.')
    }),
  ),

  http.put(
    '*/api/owner/proof-of-life',
    ownerRoute(({ userId, body }) => {
      if (hasUnknownFields(body, ['frequencyDays', 'gracePeriodDays'])) {
        return problem(400, 'Request contains fields outside the contract.')
      }
      if (!isIntegerInRange(body?.frequencyDays, 365) || !isIntegerInRange(body?.gracePeriodDays, 90)) {
        return problem(400, 'Invalid proof of life input.')
      }
      const db = getDb()
      const existing = db.proofOfLife[userId]
      if (existing && computeProofOfLife(existing).status === 'Triggered') {
        return problem(409, 'Proof of life has already been triggered.')
      }
      db.proofOfLife[userId] = existing
        ? { ...existing, frequencyDays: body.frequencyDays, gracePeriodDays: body.gracePeriodDays }
        : { frequencyDays: body.frequencyDays, gracePeriodDays: body.gracePeriodDays, lastPingAt: new Date().toISOString(), missedCount: 0 }
      saveDb()
      return HttpResponse.json(proofOfLifeDto(db.proofOfLife[userId]))
    }),
  ),

  http.post(
    '*/api/owner/proof-of-life/ping',
    ownerRoute(({ userId }) => {
      const db = getDb()
      const record = db.proofOfLife[userId]
      if (!record) return problem(404, 'Proof of life is not configured.')
      const { status } = computeProofOfLife(record)
      if (status === 'Triggered') return problem(409, 'Proof of life has already been triggered.')
      // Điểm danh khi đã quá hạn (đang trong ân hạn) được tính là một lần bỏ lỡ
      record.missedCount += status === 'Warning' ? 1 : 0
      record.lastPingAt = new Date().toISOString()
      saveDb()
      return HttpResponse.json(proofOfLifeDto(record))
    }),
  ),

  // Chỉ có ở mock: lùi thời điểm điểm danh gần nhất N ngày để thấy trạng thái Cảnh báo và Đã kích hoạt
  http.post(
    '*/api/owner/proof-of-life/simulate',
    ownerRoute(({ userId, body }) => {
      if (!isIntegerInRange(body?.days, 400)) return problem(400, 'Days must be an integer from 1 to 400.')
      const db = getDb()
      const record = db.proofOfLife[userId]
      if (!record) return problem(404, 'Proof of life is not configured.')
      record.lastPingAt = new Date(new Date(record.lastPingAt).getTime() - body.days * DAY).toISOString()
      saveDb()
      return HttpResponse.json(proofOfLifeDto(record))
    }),
  ),
]

const activityLogHandlers = [
  // Nhật ký của chính người dùng, mới nhất trước; cột theo bảng AuditLog của BE
  http.get(
    '*/api/owner/activity-logs',
    ownerRoute(({ userId }) => {
      const logs = getDb()
        .activityLogs.filter((log) => log.userId === userId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map(({ logId, action, entityType, entityId, timestamp, ipAddress, result }) => ({ logId, action, entityType, entityId, timestamp, ipAddress, result }))
      return HttpResponse.json(logs)
    }),
  ),
]

// Executor: BE mới có bảng ExecutorAssignment (theo kho) nhưng chưa có API
const executorProfile = ({ executorId, fullName, organization, licenseNumber, email, hotline, address }) => ({
  executorId,
  fullName,
  organization,
  licenseNumber,
  email,
  hotline,
  address,
})

function executorDto(db, vaultId, assignment) {
  const profile = db.executors.find((executor) => executor.executorId === assignment.executorId)
  return {
    vaultId,
    ...executorProfile(profile),
    status: assignment.status,
    assignedAt: assignment.assignedAt,
    contractNumber: assignment.contractNumber,
  }
}

// Ở chế độ hỗn hợp kho nằm ở BE thật nên mock không kiểm tra được quyền sở hữu kho
const canUseVault = (db, userId, vaultId) =>
  isMockHybrid() ? Number.isInteger(vaultId) : db.vaults.some((vault) => vault.vaultId === vaultId && vault.ownerId === userId)

const executorHandlers = [
  http.get(
    '*/api/owner/executors',
    ownerRoute(() => HttpResponse.json(getDb().executors.map(executorProfile))),
  ),

  http.get(
    '*/api/owner/vaults/:vaultId/executor',
    ownerRoute(({ userId, params }) => {
      const db = getDb()
      const vaultId = Number(params.vaultId)
      const assignment = canUseVault(db, userId, vaultId) ? db.executorAssignments[vaultId] : null
      return assignment ? HttpResponse.json(executorDto(db, vaultId, assignment)) : problem(404, 'Executor is not assigned.')
    }),
  ),

  // Gán hoặc đổi Executor: luôn tạo hợp đồng ủy quyền mới ở trạng thái chờ Executor chấp nhận
  http.put(
    '*/api/owner/vaults/:vaultId/executor',
    ownerRoute(({ userId, params, body }) => {
      if (hasUnknownFields(body, ['executorId']) || !Number.isInteger(body?.executorId)) {
        return problem(400, 'Request contains fields outside the contract.')
      }
      const db = getDb()
      const vaultId = Number(params.vaultId)
      if (!canUseVault(db, userId, vaultId)) return problem(404, 'Vault not found.')
      if (!db.executors.some((executor) => executor.executorId === body.executorId)) return problem(404, 'Executor not found.')
      const contractNumber = `HD-UQ-${new Date().getFullYear()}-${String(nextId('contract')).padStart(4, '0')}`
      db.executorAssignments[vaultId] ={ executorId: body.executorId, status: 'Pending', assignedAt: new Date().toISOString(), contractNumber }
      saveDb()
      return HttpResponse.json(executorDto(db, vaultId, db.executorAssignments[vaultId]))
    }),
  ),

  http.delete(
    '*/api/owner/vaults/:vaultId/executor',
    ownerRoute(({ userId, params }) => {
      const db = getDb()
      const vaultId = Number(params.vaultId)
      if (!canUseVault(db, userId, vaultId) || !db.executorAssignments[vaultId]) return problem(404, 'Executor is not assigned.')
      delete db.executorAssignments[vaultId]
      saveDb()
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  // Chỉ có ở mock: giả lập Executor bấm chấp nhận lời ủy quyền
  http.post(
    '*/api/owner/vaults/:vaultId/executor/accept',
    ownerRoute(({ userId, params }) => {
      const db = getDb()
      const vaultId = Number(params.vaultId)
      const assignment = canUseVault(db, userId, vaultId) ? db.executorAssignments[vaultId] : null
      if (!assignment) return problem(404, 'Executor is not assigned.')
      assignment.status = 'Active'
      saveDb()
      return HttpResponse.json(executorDto(db, vaultId, assignment))
    }),
  ),
]

export const extraHandlers = [...proofOfLifeHandlers, ...activityLogHandlers, ...executorHandlers]
