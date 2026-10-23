import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, resetMockDb, saveDb } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)
const EXECUTOR = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')

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

const addHandover = (overrides) => {
  getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status: 'Pending_Executor', initiatedAt: new Date().toISOString(), documents: [], cases: [], ...overrides })
  saveDb()
}
const deathCertificate = { documentId: 1, fileName: 'chung-tu.pdf', fileType: 'application/pdf', isEncrypted: true, hasSignature: false, purpose: 'DeathCertificate' }
const renameAsset = () => call(axiosClient.put('/owner/assets/1', { name: 'Tên mới', type: 'Other', description: null }))

describe('mock owner create handover starts awaiting the Executor like the backend', () => {
  it('create_ReadyVault_ReturnsPendingExecutorStatus', async () => {
    const { data: vault } = await axiosClient.post('/owner/vaults', { name: 'Kho thử', description: null })
    const { data: asset } = await axiosClient.post('/owner/assets', { vaultId: vault.vaultId, name: 'Tài sản', type: 'Other' })
    getDb().assets.find((item) => item.assetId === asset.assetId).documents.push({ documentId: 960, fileName: 'a.pdf', fileType: 'application/pdf', isEncrypted: true, signatureValid: null })
    saveDb()
    await axiosClient.post(`/owner/assets/${asset.assetId}/beneficiaries`, { email: 'long.tran@example.com', allocation: 100 })
    const result = await call(axiosClient.post(`/owner/vaults/${vault.vaultId}/handovers`))
    expect(result.status).toBe(201)
    expect(result.data.status).toBe('Pending_Executor')
  })
})

describe('mock owner cancel handover', () => {
  it('cancel_PendingExecutor_Returns204', async () => {
    addHandover({ status: 'Pending_Executor' })
    expect((await call(axiosClient.post('/owner/handovers/50/cancel'))).status).toBe(204)
    expect(getDb().handovers[0].status).toBe('Cancelled')
  })

  it.each(['Pending_Legal', 'Approved', 'In_Progress', 'Completed', 'Declined'])('cancel_%s_Returns409WithBackendMessage', async (status) => {
    addHandover({ status })
    const result = await call(axiosClient.post('/owner/handovers/50/cancel'))
    expect(result.status).toBe(409)
    expect(result.message).toBe('Only awaiting Executor, draft or rejected requests can be cancelled.')
  })
})

describe('mock vault lock follows backend rules for Pending_Executor and Declined', () => {
  it('lock_PendingExecutor_BlocksOwnerEdits', async () => {
    addHandover({ status: 'Pending_Executor' })
    expect((await renameAsset()).status).toBe(409)
  })

  it('lock_Declined_DoesNotBlockOwnerEdits', async () => {
    addHandover({ status: 'Declined' })
    expect((await renameAsset()).status).toBe(200)
  })

  it('lock_Declined_AllowsEditingVault', async () => {
    addHandover({ status: 'Declined' })
    expect((await call(axiosClient.put('/owner/vaults/1', { name: 'Kho đổi tên' }))).status).toBe(200)
  })
})

describe('mock life confirmation ignores declined handovers', () => {
  it('confirmAlive_DeclinedHandoverWithDeathCertificate_IsAllowed', async () => {
    addHandover({ status: 'Declined', documents: [deathCertificate] })
    expect((await call(axiosClient.post('/owner/life-confirmation'))).status).toBe(200)
  })
})

describe('mock executor can create a new handover after a declined one', () => {
  it('create_PreviousRequestDeclined_Returns201', async () => {
    addHandover({ status: 'Declined' })
    await axiosClient.post('/auth/login', { email: EXECUTOR.email, password: EXECUTOR.password })
    expect((await call(axiosClient.post('/executor/assignments/1/handovers'))).status).toBe(201)
  })

  it('create_PreviousRequestPendingExecutor_Returns409', async () => {
    addHandover({ status: 'Pending_Executor' })
    await axiosClient.post('/auth/login', { email: EXECUTOR.email, password: EXECUTOR.password })
    expect((await call(axiosClient.post('/executor/assignments/1/handovers'))).status).toBe(409)
  })
})
