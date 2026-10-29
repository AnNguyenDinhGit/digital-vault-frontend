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

const read = () => call(axiosClient.get('/owner/life-confirmation'))
const confirm = () => call(axiosClient.post('/owner/life-confirmation'))

const addHandover = (overrides) => {
  getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status: 'Draft', initiatedAt: new Date().toISOString(), documents: [], cases: [], ...overrides })
  saveDb()
}
const deathCertificate = { documentId: 1, fileName: 'chung-tu.pdf', fileType: 'application/pdf', isEncrypted: true, hasSignature: false, purpose: 'DeathCertificate' }

describe('mock owner life confirmation', () => {
  it('get_OwnerWithRecord_ReturnsOwnerIdAndLastConfirmedTime', async () => {
    const { status, data } = await read()
    expect(status).toBe(200)
    expect(data.ownerId).toBe(DEMO_ACCOUNT.userId)
    expect(new Date(data.lastConfirmedAliveAt).getTime()).toBeLessThan(Date.now())
  })

  it('get_OwnerWithoutRecord_ReturnsNullTime', async () => {
    delete getDb().proofOfLife[DEMO_ACCOUNT.userId]
    saveDb()
    expect((await read()).data).toEqual({ ownerId: DEMO_ACCOUNT.userId, lastConfirmedAliveAt: null })
  })

  it('post_NoBody_Returns200WithNewServerTimeAndPersists', async () => {
    const before = (await read()).data.lastConfirmedAliveAt
    const { status, data } = await confirm()
    expect(status).toBe(200)
    expect(new Date(data.lastConfirmedAliveAt).getTime()).toBeGreaterThan(new Date(before).getTime())
    expect((await read()).data.lastConfirmedAliveAt).toBe(data.lastConfirmedAliveAt)
  })

  it('post_OwnerWithoutRecord_CreatesRecord', async () => {
    delete getDb().proofOfLife[DEMO_ACCOUNT.userId]
    saveDb()
    expect((await confirm()).data.lastConfirmedAliveAt).not.toBeNull()
    expect((await read()).data.lastConfirmedAliveAt).not.toBeNull()
  })

  it('post_DeathCertificateInOpenHandover_Returns409AndKeepsOldTime', async () => {
    const before = (await read()).data.lastConfirmedAliveAt
    addHandover({ status: 'Pending_Legal', documents: [deathCertificate] })
    const result = await confirm()
    expect(result.status).toBe(409)
    expect(result.message).toContain('death report')
    expect((await read()).data.lastConfirmedAliveAt).toBe(before)
  })

  it.each(['Approved', 'In_Progress', 'Completed'])('post_LegallyConfirmedHandover_%s_Returns409', async (status) => {
    addHandover({ status })
    const result = await confirm()
    expect(result.status).toBe(409)
    expect(result.message).toContain('legally confirmed')
  })

  it.each(['Cancelled', 'Rejected'])('post_DeathCertificateInHandover_%s_IsAllowed', async (status) => {
    addHandover({ status, documents: [deathCertificate] })
    expect((await confirm()).status).toBe(200)
  })

  it('post_DraftHandoverWithoutDeathCertificate_IsAllowed', async () => {
    addHandover({ status: 'Draft' })
    expect((await confirm()).status).toBe(200)
  })

  it('post_HandoverOfAnotherOwner_DoesNotBlock', async () => {
    getDb().vaults.push({ vaultId: 9, ownerId: 2, name: 'Kho khác', description: null, status: 'Active' })
    addHandover({ vaultId: 9, status: 'Approved' })
    expect((await confirm()).status).toBe(200)
  })

  it('get_ExecutorRole_Returns403', async () => {
    const executor = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')
    await axiosClient.post('/auth/login', { email: executor.email, password: executor.password })
    expect((await read()).status).toBe(403)
    expect((await confirm()).status).toBe(403)
  })
})
