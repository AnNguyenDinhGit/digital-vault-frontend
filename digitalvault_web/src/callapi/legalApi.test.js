import { beforeEach, describe, expect, it, vi } from 'vitest'
import axiosClient from './axiosClient'
import { getLegalHandover } from './legalApi'

vi.mock('./axiosClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

const wrapped = { request: { requestId: 2, vaultId: 9, status: 'Pending_Legal', documents: [{ documentId: 8 }] }, verification: { verificationId: 1 } }

describe('legalApi', () => {
  beforeEach(() => vi.resetAllMocks())

  it('getLegalHandover_WrappedResponse_FlattensRequestAndAddsAssetDocumentsNotInHandover', async () => {
    axiosClient.get.mockImplementation(async (url) => ({ data: url.endsWith('/documents') ? [{ documentId: 8 }, { documentId: 11 }] : wrapped }))
    await expect(getLegalHandover(2)).resolves.toEqual({
      requestId: 2,
      vaultId: 9,
      status: 'Pending_Legal',
      documents: [{ documentId: 8 }],
      verification: { verificationId: 1 },
      assetDocuments: [{ documentId: 11 }],
    })
    expect(axiosClient.get).toHaveBeenCalledWith('/legal/handovers/2')
    expect(axiosClient.get).toHaveBeenCalledWith('/legal/handovers/2/documents')
  })

  it('getLegalHandover_DocumentsRequestFails_StillReturnsHandoverWithNoAssetDocuments', async () => {
    axiosClient.get.mockImplementation(async (url) => {
      if (url.endsWith('/documents')) throw new Error('boom')
      return { data: wrapped }
    })
    await expect(getLegalHandover(2)).resolves.toMatchObject({ requestId: 2, assetDocuments: [] })
  })

  it('getLegalHandover_FlatResponse_ReturnsAsIs', async () => {
    axiosClient.get.mockResolvedValue({ data: { requestId: 3, status: 'Approved' } })
    await expect(getLegalHandover(3)).resolves.toEqual({ requestId: 3, status: 'Approved' })
    expect(axiosClient.get).toHaveBeenCalledTimes(1)
  })
})
