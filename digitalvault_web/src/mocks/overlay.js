import { bypass, http, HttpResponse } from 'msw'
import { parseAssetUpdate } from './assetInput'
import { getDb, getSessionUserId, saveDb } from './db'
import { ownerRoute, problem } from './helpers'

// Lớp phủ cho chế độ hỗn hợp: BE thật chưa cho sửa/xóa nên mock ghi lại thay đổi theo userId rồi phủ lên dữ liệu BE trả về.

// Gọi BE thật bỏ qua MSW; request gốc của axios được dựng lại thành GET kèm cookie
export const defaultFetchUpstream = (request) =>
  fetch(bypass(new Request(request.url, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } })))

const emptyOverlay = () => ({ assetEdits: {}, deletedAssets: [] })

const overlayOf = (userId) => getDb().overlay[userId] ?? emptyOverlay()

function updateOverlay(userId, change) {
  const db = getDb()
  db.overlay[userId] = change(db.overlay[userId] ?? emptyOverlay())
  saveDb()
}

export function applyAssetOverlay(assets, overlay) {
  return assets
    .filter((asset) => !overlay.deletedAssets.includes(asset.assetId))
    .map((asset) => ({ ...asset, ...overlay.assetEdits[asset.assetId] }))
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
  ]
}
