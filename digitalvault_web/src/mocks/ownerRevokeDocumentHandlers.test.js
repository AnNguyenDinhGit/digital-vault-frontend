import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, resetMockDb, saveDb } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
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

// Tài sản 2 có đúng một giấy tờ (documentId 11), tài sản 3 có hai giấy tờ (12, 13)
const revoke = (assetId, documentId) => call(axiosClient.post(`/owner/assets/${assetId}/documents/${documentId}/revoke`))
const documentsOf = async (assetId) => (await axiosClient.get(`/owner/assets/${assetId}`)).data.documents.map((item) => item.documentId)

describe('mock owner revoke document', () => {
  it('revoke_ExistingDocument_Returns204AndHidesItFromAsset', async () => {
    expect((await revoke(3, 12)).status).toBe(204)
    expect(await documentsOf(3)).toEqual([13])
  })

  it('revoke_ExistingDocument_ContentNoLongerDownloadable', async () => {
    await revoke(3, 12)
    expect((await call(axiosClient.get('/owner/assets/3/documents/12/content', { responseType: 'text' }))).status).toBe(404)
  })

  it('revoke_ExistingDocument_UpdatesAssetListDocuments', async () => {
    await revoke(3, 12)
    const { data } = await axiosClient.get('/owner/assets')
    expect(data.find((asset) => asset.assetId === 3).documents).toHaveLength(1)
  })

  it('revoke_SameDocumentTwice_Returns409AlreadyRevoked', async () => {
    await revoke(3, 12)
    const result = await revoke(3, 12)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Document already revoked.')
  })

  it('revoke_UnknownDocument_Returns404', async () => {
    expect((await revoke(3, 999)).status).toBe(404)
  })

  it('revoke_DocumentOfAnotherAsset_Returns404', async () => {
    expect((await revoke(2, 12)).status).toBe(404)
  })

  it('revoke_UnknownAsset_Returns404', async () => {
    expect((await revoke(999, 12)).status).toBe(404)
  })

  it('revoke_AssetOfAnotherOwner_Returns404', async () => {
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await revoke(3, 12)).status).toBe(404)
  })

  it('revoke_VaultWithOpenHandover_Returns409Protected', async () => {
    getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status: 'Draft', initiatedAt: new Date().toISOString(), documents: [], cases: [] })
    saveDb()
    const result = await revoke(3, 12)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Handover records protect this vault from mutation.')
  })

  it('revoke_RevokedAsset_Returns409', async () => {
    await axiosClient.post('/owner/assets/3/revoke')
    expect((await revoke(3, 12)).status).toBe(409)
  })

  it('revoke_LastDocument_MakesAssetNotReadyForHandover', async () => {
    const { data: vault } = await axiosClient.post('/owner/vaults', { name: 'Kho thử', description: null })
    const { data: asset } = await axiosClient.post('/owner/assets', { vaultId: vault.vaultId, name: 'Tài sản', type: 'Other' })
    getDb().assets.find((item) => item.assetId === asset.assetId).documents.push({ documentId: 950, fileName: 'a.pdf', fileType: 'application/pdf', isEncrypted: true, signatureValid: null })
    saveDb()
    await axiosClient.post(`/owner/assets/${asset.assetId}/beneficiaries`, { email: 'long.tran@example.com', allocation: 100 })
    await revoke(asset.assetId, 950)
    const result = await call(axiosClient.post(`/owner/vaults/${vault.vaultId}/handovers`))
    expect(result.status).toBe(409)
    expect(result.message).toBe('Every active asset needs documents and exactly 100 percent active allocation.')
  })

  it('revoke_ExecutorRole_Returns403', async () => {
    const executor = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')
    await axiosClient.post('/auth/login', { email: executor.email, password: executor.password })
    expect((await revoke(3, 12)).status).toBe(403)
  })
})
