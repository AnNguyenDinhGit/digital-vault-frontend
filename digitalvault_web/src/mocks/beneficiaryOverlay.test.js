import { HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { resetMockDb, setMockHybrid } from './db'
import { extraHandlers } from './extraHandlers'
import { createAssetOverlayHandlers } from './overlay'

// BE thật giả lập: tài sản 101 có Lan 40% + Hùng 60%, tài sản 102 có Lan 100%
const REAL_ASSETS = [
  { assetId: 101, name: 'Tài sản 1', type: 'BankAccount', description: null, status: 'Active', documents: [] },
  { assetId: 102, name: 'Tài sản 2', type: 'BankAccount', description: null, status: 'Active', documents: [] },
]
const REAL_ROWS = [
  { assetId: 101, beneficiaryId: 7, fullName: 'Lan', allocation: 40, status: 'Active' },
  { assetId: 101, beneficiaryId: 8, fullName: 'Hùng', allocation: 60, status: 'Active' },
  { assetId: 102, beneficiaryId: 7, fullName: 'Lan', allocation: 100, status: 'Active' },
]

let upstreamStatus = 200
const fetchUpstream = vi.fn(async (request) => {
  if (upstreamStatus !== 200) return HttpResponse.json({ status: upstreamStatus, detail: 'Từ BE thật' }, { status: upstreamStatus })
  const url = new URL(request.url)
  if (url.pathname.endsWith('/beneficiaries')) {
    const assetId = url.searchParams.get('assetId')
    return HttpResponse.json(assetId === null ? REAL_ROWS : REAL_ROWS.filter((row) => row.assetId === Number(assetId)))
  }
  if (url.pathname.endsWith('/assets')) return HttpResponse.json(REAL_ASSETS)
  const found = REAL_ASSETS.find((asset) => url.pathname.endsWith(`/assets/${asset.assetId}`))
  return found ? HttpResponse.json(found) : HttpResponse.json({ status: 404, detail: 'Asset not found.' }, { status: 404 })
})

const server = setupServer(...createAssetOverlayHandlers(fetchUpstream), ...extraHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetMockDb()
  setMockHybrid(true)
  sessionStorage.setItem('aeterna.user', JSON.stringify({ userId: 42, roles: ['Owner'], email: 'u42@example.com' }))
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
const rows = async (params) => (await axiosClient.get('/owner/beneficiaries', { params })).data

describe('beneficiary overlay in hybrid mode', () => {
  it('get_NoEdits_ReturnsUpstreamRowsUnchanged', async () => {
    expect(await rows()).toEqual(REAL_ROWS)
  })

  it('put_LowerAllocation_ListAndPerAssetViewShowNewValue', async () => {
    const saved = await call(axiosClient.put('/owner/assets/101/beneficiaries/7', { allocation: 30 }))
    expect(saved.status).toBe(200)
    expect(saved.data).toMatchObject({ assetId: 101, beneficiaryId: 7, fullName: 'Lan', allocation: 30 })
    expect((await rows()).find((row) => row.assetId === 101 && row.beneficiaryId === 7).allocation).toBe(30)
    expect((await rows({ assetId: 101 })).find((row) => row.beneficiaryId === 7).allocation).toBe(30)
  })

  it('put_TotalWouldExceed100_Returns409', async () => {
    expect((await call(axiosClient.put('/owner/assets/101/beneficiaries/7', { allocation: 50 }))).status).toBe(409)
  })

  it('put_UsesEditedValuesWhenCheckingTotal', async () => {
    await axiosClient.put('/owner/assets/101/beneficiaries/8', { allocation: 10 })
    expect((await call(axiosClient.put('/owner/assets/101/beneficiaries/7', { allocation: 90 }))).status).toBe(200)
  })

  it('put_InvalidAllocation_Returns400', async () => {
    expect((await call(axiosClient.put('/owner/assets/101/beneficiaries/7', { allocation: 0 }))).status).toBe(400)
  })

  it('put_BeneficiaryNotOnAsset_Returns404', async () => {
    expect((await call(axiosClient.put('/owner/assets/101/beneficiaries/99', { allocation: 10 }))).status).toBe(404)
  })

  it('delete_Beneficiary_DisappearsFromBothViewsAndFreesAllocation', async () => {
    expect((await call(axiosClient.delete('/owner/assets/101/beneficiaries/7'))).status).toBe(204)
    expect((await rows()).map((row) => `${row.assetId}:${row.beneficiaryId}`)).toEqual(['101:8', '102:7'])
    expect((await rows({ assetId: 101 })).map((row) => row.beneficiaryId)).toEqual([8])
    expect((await call(axiosClient.put('/owner/assets/101/beneficiaries/8', { allocation: 100 }))).status).toBe(200)
  })

  it('delete_Twice_SecondReturns404', async () => {
    await axiosClient.delete('/owner/assets/101/beneficiaries/7')
    expect((await call(axiosClient.delete('/owner/assets/101/beneficiaries/7'))).status).toBe(404)
  })

  it('get_DeletedAsset_RowsOfThatAssetAreDropped', async () => {
    await axiosClient.delete('/owner/assets/101')
    expect((await rows()).every((row) => row.assetId !== 101)).toBe(true)
    expect((await call(axiosClient.get('/owner/beneficiaries', { params: { assetId: 101 } }))).status).toBe(404)
  })

  it('get_UpstreamError_IsPassedThrough', async () => {
    upstreamStatus = 401
    const result = await call(axiosClient.get('/owner/beneficiaries'))
    expect(result.status).toBe(401)
    expect(result.message).toBe('Từ BE thật')
  })
})
