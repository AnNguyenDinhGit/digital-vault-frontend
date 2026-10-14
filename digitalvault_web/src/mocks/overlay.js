import { bypass, http, HttpResponse } from 'msw'
import { parseAllocation, parseAssetUpdate } from './assetInput'
import { getDb, getSessionUserId, saveDb } from './db'
import { ownerRoute, problem } from './helpers'

// Lớp phủ cho chế độ hỗn hợp: BE thật chưa cho sửa/xóa nên mock ghi lại thay đổi theo userId rồi phủ lên dữ liệu BE trả về.

// Gọi BE thật bỏ qua MSW; request gốc của axios được dựng lại thành GET và giữ nguyên Bearer token
export function buildUpstreamRequest(request) {
  const headers = { Accept: 'application/json' }
  const authorization = request.headers.get('Authorization')
  if (authorization) headers.Authorization = authorization
  return new Request(request.url, { method: 'GET', headers })
}

export const defaultFetchUpstream = (request) => fetch(bypass(buildUpstreamRequest(request)))

const emptyOverlay = () => ({ assetEdits: {}, deletedAssets: [], allocationEdits: {}, removedAssignments: [] })

const overlayOf = (userId) => ({ ...emptyOverlay(), ...getDb().overlay[userId] })

function updateOverlay(userId, change) {
  const db = getDb()
  db.overlay[userId] = change(overlayOf(userId))
  saveDb()
}

const assignmentKey = (assetId, beneficiaryId) => `${assetId}:${beneficiaryId}`

export function applyAssetOverlay(assets, overlay) {
  return assets
    .filter((asset) => !overlay.deletedAssets.includes(asset.assetId))
    .map((asset) => ({ ...asset, ...overlay.assetEdits[asset.assetId] }))
}

export function applyBeneficiaryOverlay(rows, overlay) {
  return rows
    .filter((row) => !overlay.deletedAssets.includes(row.assetId))
    .filter((row) => !overlay.removedAssignments.includes(assignmentKey(row.assetId, row.beneficiaryId)))
    .map((row) => {
      const edited = overlay.allocationEdits[assignmentKey(row.assetId, row.beneficiaryId)]
      return edited === undefined ? row : { ...row, allocation: edited }
    })
}

// Dựng request lấy danh sách người thụ hưởng của một tài sản từ URL /assets/:id/beneficiaries/:id
function beneficiaryListRequest(request, assetId) {
  const url = new URL(request.url)
  url.pathname = url.pathname.replace(/\/assets\/\d+\/beneficiaries\/\d+$/, '/beneficiaries')
  url.search = `?assetId=${assetId}`
  return new Request(url)
}

// Lấy các dòng phân bổ của một tài sản (đã áp lớp phủ); trả về Response lỗi nếu BE thật báo lỗi
async function loadAssetRows(fetchUpstream, request, assetId, overlay) {
  const upstream = await fetchUpstream(beneficiaryListRequest(request, assetId))
  if (!upstream.ok) return { failure: upstream }
  return { rows: applyBeneficiaryOverlay(await upstream.json(), overlay) }
}

// fetchUpstream tách riêng để test thay bằng BE giả
export function createAssetOverlayHandlers(fetchUpstream = defaultFetchUpstream) {
  return [
    http.get('*/api/owner/assets', async ({ request }) => {
      const upstream = await fetchUpstream(request)
      const userId = getSessionUserId()
      if (!upstream.ok || userId === null) return upstream
      return HttpResponse.json(applyAssetOverlay(await upstream.json(), overlayOf(userId)))
    }),

    http.get('*/api/owner/assets/:assetId', async ({ request, params }) => {
      const userId = getSessionUserId()
      if (userId !== null && overlayOf(userId).deletedAssets.includes(Number(params.assetId))) return problem(404, 'Asset not found.')
      const upstream = await fetchUpstream(request)
      if (!upstream.ok || userId === null) return upstream
      return HttpResponse.json(applyAssetOverlay([await upstream.json()], overlayOf(userId))[0])
    }),

    http.put(
      '*/api/owner/assets/:assetId',
      ownerRoute(async ({ request, params, userId, body }) => {
        const parsed = parseAssetUpdate(body)
        if (parsed.error) return problem(400, parsed.error)
        const assetId = Number(params.assetId)
        if (overlayOf(userId).deletedAssets.includes(assetId)) return problem(404, 'Asset not found.')
        const upstream = await fetchUpstream(request)
        if (!upstream.ok) return upstream
        updateOverlay(userId, (overlay) => ({ ...overlay, assetEdits: { ...overlay.assetEdits, [assetId]: parsed.value } }))
        return HttpResponse.json({ ...(await upstream.json()), ...parsed.value })
      }),
    ),

    http.delete(
      '*/api/owner/assets/:assetId',
      ownerRoute(async ({ request, params, userId }) => {
        const assetId = Number(params.assetId)
        if (overlayOf(userId).deletedAssets.includes(assetId)) return problem(404, 'Asset not found.')
        const upstream = await fetchUpstream(request)
        if (!upstream.ok) return upstream
        updateOverlay(userId, (overlay) => ({ ...overlay, deletedAssets: [...overlay.deletedAssets, assetId] }))
        return new HttpResponse(null, { status: 204 })
      }),
    ),

    http.get('*/api/owner/beneficiaries', async ({ request }) => {
      const userId = getSessionUserId()
      const assetIdParam = new URL(request.url).searchParams.get('assetId')
      if (userId !== null && assetIdParam !== null && overlayOf(userId).deletedAssets.includes(Number(assetIdParam))) {
        return problem(404, 'Asset not found.')
      }
      const upstream = await fetchUpstream(request)
      if (!upstream.ok || userId === null) return upstream
      return HttpResponse.json(applyBeneficiaryOverlay(await upstream.json(), overlayOf(userId)))
    }),

    http.put(
      '*/api/owner/assets/:assetId/beneficiaries/:beneficiaryId',
      ownerRoute(async ({ request, params, userId, body }) => {
        const parsed = parseAllocation(body)
        if (parsed.error) return problem(400, parsed.error)
        const assetId = Number(params.assetId)
        const beneficiaryId = Number(params.beneficiaryId)
        const overlay = overlayOf(userId)
        if (overlay.deletedAssets.includes(assetId)) return problem(404, 'Asset not found.')
        const { rows, failure } = await loadAssetRows(fetchUpstream, request, assetId, overlay)
        if (failure) return failure
        const row = rows.find((item) => item.beneficiaryId === beneficiaryId)
        if (!row) return problem(404, 'Beneficiary assignment not found.')
        const others = rows.filter((item) => item !== row).reduce((sum, item) => sum + item.allocation, 0)
        if (Math.round((others + parsed.value) * 100) / 100 > 100) return problem(409, 'Total allocation exceeds 100%.')
        updateOverlay(userId, (current) => ({
          ...current,
          allocationEdits: { ...current.allocationEdits, [assignmentKey(assetId, beneficiaryId)]: parsed.value },
        }))
        return HttpResponse.json({ ...row, allocation: parsed.value })
      }),
    ),

    http.delete(
      '*/api/owner/assets/:assetId/beneficiaries/:beneficiaryId',
      ownerRoute(async ({ request, params, userId }) => {
        const assetId = Number(params.assetId)
        const beneficiaryId = Number(params.beneficiaryId)
        const overlay = overlayOf(userId)
        if (overlay.deletedAssets.includes(assetId)) return problem(404, 'Asset not found.')
        const { rows, failure } = await loadAssetRows(fetchUpstream, request, assetId, overlay)
        if (failure) return failure
        if (!rows.some((item) => item.beneficiaryId === beneficiaryId)) return problem(404, 'Beneficiary assignment not found.')
        updateOverlay(userId, (current) => ({
          ...current,
          removedAssignments: [...current.removedAssignments, assignmentKey(assetId, beneficiaryId)],
        }))
        return new HttpResponse(null, { status: 204 })
      }),
    ),
  ]
}
