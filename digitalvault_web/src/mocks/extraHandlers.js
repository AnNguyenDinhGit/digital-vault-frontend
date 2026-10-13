import { http, HttpResponse } from 'msw'
import { computeProofOfLife } from '../utils/proofOfLife'
import { getDb, saveDb } from './db'
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

export const extraHandlers = [...proofOfLifeHandlers]
