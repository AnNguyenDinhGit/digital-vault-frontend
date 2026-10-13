import { HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { resetMockDb, setMockHybrid } from './db'
import { extraHandlers } from './extraHandlers'
import { createAssetOverlayHandlers } from './overlay'

// Chế độ hỗn hợp: BE thật giả lập bằng hàm fetchUpstream, mock chỉ phủ chỉnh sửa/xóa lên kết quả
const REAL_ASSETS = [
  { assetId: 101, name: 'Tài sản thật 1', type: 'BankAccount', description: 'Mô tả 1', status: 'Active', documents: [{ documentId: 1, fileName: 'a.pdf' }] },
  { assetId: 102, name: 'Tài sản thật 2', type: 'CryptoWallet', description: null, status: 'Active', documents: [] },
]

let upstreamStatus = 200
const fetchUpstream = vi.fn(async (request) => {
  if (upstreamStatus !== 200) return HttpResponse.json({ status: upstreamStatus, detail: 'Từ BE thật' }, { status: upstreamStatus })
  const { pathname } = new URL(request.url)
  if (pathname.endsWith('/assets')) return HttpResponse.json(REAL_ASSETS)
  const found = REAL_ASSETS.find((asset) => pathname.endsWith(`/assets/${asset.assetId}`))
  return found ? HttpResponse.json(found) : HttpResponse.json({ status: 404, detail: 'Asset not found.' }, { status: 404 })
})

const server = setupServer(...createAssetOverlayHandlers(fetchUpstream), ...extraHandlers)

const storeUser = (userId) => sessionStorage.setItem('aeterna.user', JSON.stringify({ userId, roles: ['Owner'], email: `u${userId}@example.com` }))

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetMockDb()
  setMockHybrid(true)
  storeUser(42)
  upstreamStatus = 200
  fetchUpstream.mockClear()
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const call = async (promise) => {
  try {
    const response = await promise
    return { status: response.status, data: response.data }
  } catch (error) {
    return { status: error.status, message: error.message }
  }
}

describe('asset overlay in hybrid mode', () => {
  it('get_NoEdits_ReturnsUpstreamDataUnchanged', async () => {
    const result = await call(axiosClient.get('/owner/assets'))
    expect(result.data).toEqual(REAL_ASSETS)
    expect(fetchUpstream).toHaveBeenCalledTimes(1)
  })

  it('put_EditRealAsset_ListAndDetailShowEditedFieldsButKeepDocuments', async () => {
    const saved = await call(axiosClient.put('/owner/assets/101', { name: 'Tên đã sửa', type: 'Document', description: 'Mô tả đã sửa' }))
    expect(saved.status).toBe(200)
    expect(saved.data).toMatchObject({ assetId: 101, name: 'Tên đã sửa', type: 'Document', description: 'Mô tả đã sửa' })
    expect(saved.data.documents).toEqual(REAL_ASSETS[0].documents)

    const list = (await axiosClient.get('/owner/assets')).data
    expect(list[0]).toMatchObject({ assetId: 101, name: 'Tên đã sửa', type: 'Document' })
    expect(list[0].documents).toHaveLength(1)
    expect(list[1].name).toBe('Tài sản thật 2')
    expect((await axiosClient.get('/owner/assets/101')).data.name).toBe('Tên đã sửa')
  })

  it('put_UnknownAssetOnUpstream_Returns404', async () => {
    const result = await call(axiosClient.put('/owner/assets/999', { name: 'x', type: 'BankAccount', description: null }))
    expect(result.status).toBe(404)
  })

  it('put_InvalidBody_Returns400BeforeCallingUpstream', async () => {
    expect((await call(axiosClient.put('/owner/assets/101', { name: ' ', type: 'BankAccount' }))).status).toBe(400)
  })

  it('delete_RealAsset_DisappearsFromListAndDetail', async () => {
    expect((await call(axiosClient.delete('/owner/assets/101'))).status).toBe(204)
    expect((await axiosClient.get('/owner/assets')).data.map((a) => a.assetId)).toEqual([102])
    expect((await call(axiosClient.get('/owner/assets/101'))).status).toBe(404)
  })

  it('delete_UnknownAssetOnUpstream_Returns404', async () => {
    expect((await call(axiosClient.delete('/owner/assets/999'))).status).toBe(404)
  })

  it('overlay_IsPerUser_OtherUserDoesNotSeeEdits', async () => {
    await axiosClient.put('/owner/assets/101', { name: 'Chỉ user 42', type: 'BankAccount', description: null })
    storeUser(43)
    expect((await axiosClient.get('/owner/assets')).data[0].name).toBe('Tài sản thật 1')
  })

  it('get_UpstreamError_IsPassedThrough', async () => {
    upstreamStatus = 401
    const result = await call(axiosClient.get('/owner/assets'))
    expect(result.status).toBe(401)
    expect(result.message).toBe('Từ BE thật')
  })

  it('get_NoSession_ReturnsUpstreamDataUnchanged', async () => {
    sessionStorage.removeItem('aeterna.user')
    expect((await call(axiosClient.get('/owner/assets'))).data).toEqual(REAL_ASSETS)
  })
})
