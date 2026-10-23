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

// Dựng một kho sẵn sàng bàn giao: 1 tài sản có giấy tờ và đủ 100% phân bổ Active cho hai người
async function readyVault({ allocate = true, withDocument = true } = {}) {
  const { data: vault } = await axiosClient.post('/owner/vaults', { name: 'Kho thử nghiệm', description: null })
  const { data: asset } = await axiosClient.post('/owner/assets', { vaultId: vault.vaultId, name: 'Tài sản thử nghiệm', type: 'Other' })
  if (withDocument) {
    getDb().assets.find((item) => item.assetId === asset.assetId).documents.push({ documentId: 900, fileName: 'a.pdf', fileType: 'application/pdf', isEncrypted: true, signatureValid: null })
    saveDb()
  }
  if (allocate) {
    await axiosClient.post(`/owner/assets/${asset.assetId}/beneficiaries`, { email: 'long.tran@example.com', allocation: 60 })
    await axiosClient.post(`/owner/assets/${asset.assetId}/beneficiaries`, { email: 'mai.nguyen@example.com', allocation: 40 })
  }
  return { vault, asset }
}

const create = (vaultId) => call(axiosClient.post(`/owner/vaults/${vaultId}/handovers`))

describe('mock owner create handover', () => {
  it('create_ReadyVaultWithoutExecutor_Returns201DraftAndAutoAssignsExecutor', async () => {
    const { vault, asset } = await readyVault()
    const { status, data } = await create(vault.vaultId)
    expect(status).toBe(201)
    expect(data).toMatchObject({ vaultId: vault.vaultId, requestType: 'Inheritance', status: 'Pending_Executor' })
    expect(data.cases).toHaveLength(2)
    expect(data.cases.every((item) => item.assetId === asset.assetId)).toBe(true)
    expect(getDb().executorAssignments[vault.vaultId]).toMatchObject({ executorId: 5, status: 'AutoAssigned' })
  })

  it('create_VaultWithAssignedExecutor_UsesThatExecutor', async () => {
    const { vault } = await readyVault()
    getDb().executorAssignments[vault.vaultId] = { executorId: 21, status: 'Active', assignedAt: new Date().toISOString(), contractNumber: 'HD-1' }
    saveDb()
    await create(vault.vaultId)
    expect(getDb().handovers.find((item) => item.vaultId === vault.vaultId).executorId).toBe(21)
  })

  it('create_NewRequest_AppearsInOwnerHandoverList', async () => {
    const { vault } = await readyVault()
    const { data } = await create(vault.vaultId)
    const { data: page } = await axiosClient.get('/owner/handovers')
    expect(page.items.map((item) => item.requestId)).toContain(data.requestId)
  })

  it('create_AssetWithoutDocument_Returns409NotReady', async () => {
    const { vault } = await readyVault({ withDocument: false })
    const result = await create(vault.vaultId)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Every active asset needs documents and exactly 100 percent active allocation.')
  })

  it('create_AllocationBelowHundred_Returns409NotReady', async () => {
    const { vault } = await readyVault({ allocate: false })
    await axiosClient.post(`/owner/assets/${(getDb().assets.at(-1)).assetId}/beneficiaries`, { email: 'long.tran@example.com', allocation: 60 })
    expect((await create(vault.vaultId)).status).toBe(409)
  })

  it('create_VaultWithoutAssets_Returns409NotReady', async () => {
    const { data: vault } = await axiosClient.post('/owner/vaults', { name: 'Kho trống', description: null })
    expect((await create(vault.vaultId)).status).toBe(409)
  })

  it('create_SecondRequestWhileFirstIsOpen_Returns409Protected', async () => {
    const { vault } = await readyVault()
    await create(vault.vaultId)
    const result = await create(vault.vaultId)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Vault is inactive or has a protected handover record.')
  })

  it('create_AfterCancellingPreviousRequest_Returns201Again', async () => {
    const { vault } = await readyVault()
    const first = await create(vault.vaultId)
    await axiosClient.post(`/owner/handovers/${first.data.requestId}/cancel`)
    expect((await create(vault.vaultId)).status).toBe(201)
  })

  it('create_ExecutorIsAlsoActiveBeneficiary_Returns409NotIndependent', async () => {
    const { vault, asset } = await readyVault({ allocate: false })
    await axiosClient.post(`/owner/assets/${asset.assetId}/beneficiaries`, { email: 'executor@example.com', allocation: 100 })
    const result = await create(vault.vaultId)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Assigned Executor must be independent of the owner and beneficiaries.')
  })

  it('create_NoEligibleExecutor_Returns503', async () => {
    const { vault } = await readyVault()
    getDb().users.forEach((user) => (user.roles = user.roles.filter((role) => role !== 'Executor')))
    saveDb()
    expect((await create(vault.vaultId)).status).toBe(503)
  })

  it('create_UnknownVault_Returns404', async () => {
    expect((await create(999)).status).toBe(404)
  })

  it('create_VaultOfAnotherOwner_Returns404', async () => {
    const { vault } = await readyVault()
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await create(vault.vaultId)).status).toBe(404)
  })

  it('create_ExecutorRole_Returns403', async () => {
    const executor = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')
    await axiosClient.post('/auth/login', { email: executor.email, password: executor.password })
    expect((await create(1)).status).toBe(403)
  })
})

describe('mock owner handover detail', () => {
  it('getDetail_OwnRequest_ReturnsHandoverDto', async () => {
    const { vault } = await readyVault()
    const { data: created } = await create(vault.vaultId)
    const { status, data } = await call(axiosClient.get(`/owner/handovers/${created.requestId}`))
    expect(status).toBe(200)
    expect(data).toMatchObject({ requestId: created.requestId, vaultId: vault.vaultId, status: 'Pending_Executor' })
    expect(data.cases).toHaveLength(2)
  })

  it('getDetail_UnknownRequest_Returns404', async () => {
    expect((await call(axiosClient.get('/owner/handovers/999'))).status).toBe(404)
  })

  it('getDetail_RequestOfAnotherOwner_Returns404', async () => {
    const { vault } = await readyVault()
    const { data: created } = await create(vault.vaultId)
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await call(axiosClient.get(`/owner/handovers/${created.requestId}`))).status).toBe(404)
  })

  it('getDetail_ExecutorRole_Returns403', async () => {
    const executor = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')
    await axiosClient.post('/auth/login', { email: executor.email, password: executor.password })
    expect((await call(axiosClient.get('/owner/handovers/1'))).status).toBe(403)
  })
})
