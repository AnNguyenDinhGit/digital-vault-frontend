import { beforeEach, describe, expect, it, vi } from 'vitest'
import axiosClient from './axiosClient'
import { getLegalAssets, getLegalHandover, getLegalHistory } from './legalApi'

vi.mock('./axiosClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

const wrapped = { request: { requestId: 2, vaultId: 9, status: 'Pending_Legal', documents: [{ documentId: 8 }] }, verification: { verificationId: 1 } }
const history = [
  { verificationId: 1, requestId: 2, verifierName: 'A', status: 'Additional_Info', submittedAt: '2026-10-23T14:00:00', reviewedAt: '2026-10-23T15:00:00', comment: 'thiếu giấy' },
  { verificationId: 2, requestId: 2, verifierName: 'A', status: 'Pending', submittedAt: '2026-10-24T09:00:00', reviewedAt: null, comment: null },
]
const ownerStatus = { ownerId: 5, fullName: 'Phạm Nhật Tiến', status: 'Triggered', deathCertificateDocumentId: 8 }
const assets = [{ assetId: 27, name: 'Ví crypto', type: 'CryptoWallet', status: 'Active', documents: [{ documentId: 11, fileName: 'a.pdf' }] }]

describe('legalApi', () => {
  beforeEach(() => vi.resetAllMocks())

  it('getLegalHandover_WrappedResponse_FlattensRequestAndAddsOwnerAssetsWithDocuments', async () => {
    axiosClient.get.mockImplementation(async (url) => ({ data: url.endsWith('/assets') ? { page: 1, pageSize: 100, items: assets } : url.endsWith('/history') ? [] : url.endsWith('/owner-status') ? ownerStatus : wrapped }))
    await expect(getLegalHandover(2)).resolves.toEqual({
      requestId: 2,
      vaultId: 9,
      status: 'Pending_Legal',
      documents: [{ documentId: 8 }],
      verification: { verificationId: 1 },
      assets,
      history: [],
      ownerStatus,
    })
    expect(axiosClient.get).toHaveBeenCalledWith('/legal/handovers/2')
    expect(axiosClient.get).toHaveBeenCalledWith('/legal/handovers/2/assets', { params: { page: 1, pageSize: 100 } })
  })

  it('getLegalHandover_AssetsRequestFails_StillReturnsHandoverWithNoAssets', async () => {
    axiosClient.get.mockImplementation(async (url) => {
      if (url.endsWith('/assets')) throw new Error('boom')
      return { data: wrapped }
    })
    await expect(getLegalHandover(2)).resolves.toMatchObject({ requestId: 2, assets: [] })
  })

  it('getLegalHandover_OwnerStatusRequestFails_StillReturnsHandoverWithNullOwnerStatus', async () => {
    axiosClient.get.mockImplementation(async (url) => {
      if (url.endsWith('/owner-status')) throw new Error('boom')
      return { data: url.endsWith('/assets') ? { items: [] } : url.endsWith('/history') ? [] : wrapped }
    })
    await expect(getLegalHandover(2)).resolves.toMatchObject({ requestId: 2, ownerStatus: null })
  })

  it('getLegalHandover_HistoryRequestFails_StillReturnsHandoverWithEmptyHistory', async () => {
    axiosClient.get.mockImplementation(async (url) => {
      if (url.endsWith('/history')) throw new Error('boom')
      return { data: url.endsWith('/assets') ? { items: [] } : wrapped }
    })
    await expect(getLegalHandover(2)).resolves.toMatchObject({ requestId: 2, history: [] })
  })

  it('getLegalHistory_Entries_AreSortedNewestFirst', async () => {
    axiosClient.get.mockResolvedValue({ data: history })
    const result = await getLegalHistory(2)
    expect(result.map((entry) => entry.verificationId)).toEqual([2, 1])
    expect(axiosClient.get).toHaveBeenCalledWith('/legal/handovers/2/history')
  })

  it('getLegalHandover_FlatResponse_ReturnsAsIs', async () => {
    axiosClient.get.mockResolvedValue({ data: { requestId: 3, status: 'Approved' } })
    await expect(getLegalHandover(3)).resolves.toEqual({ requestId: 3, status: 'Approved' })
    expect(axiosClient.get).toHaveBeenCalledTimes(1)
  })

  it('getLegalAssets_PageDto_ReturnsItems', async () => {
    axiosClient.get.mockResolvedValue({ data: { page: 1, pageSize: 100, items: assets } })
    await expect(getLegalAssets(5)).resolves.toEqual(assets)
  })
})
