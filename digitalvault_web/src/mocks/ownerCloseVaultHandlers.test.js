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

const close = (vaultId) => call(axiosClient.post(`/owner/vaults/${vaultId}/close`))

describe('mock owner close vault', () => {
  it('close_ActiveVault_Returns204AndMarksClosed', async () => {
    expect((await close(1)).status).toBe(204)
    expect((await axiosClient.get('/owner/vaults/1')).data.status).toBe('Closed')
  })

  it('close_AlreadyClosedVault_Returns409', async () => {
    await close(1)
    expect((await close(1)).status).toBe(409)
  })

  it('close_VaultWithOpenHandover_Returns409Protected', async () => {
    getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status: 'In_Progress', initiatedAt: new Date().toISOString(), documents: [], cases: [] })
    saveDb()
    const result = await close(1)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Vault is inactive or has a protected handover record.')
  })

  it('close_VaultWithOnlyCancelledHandover_Returns204', async () => {
    getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status: 'Cancelled', initiatedAt: new Date().toISOString(), documents: [], cases: [] })
    saveDb()
    expect((await close(1)).status).toBe(204)
  })

  it('close_UnknownVault_Returns404', async () => {
    expect((await close(999)).status).toBe(404)
  })

  it('close_VaultOfAnotherOwner_Returns404', async () => {
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await close(1)).status).toBe(404)
  })

  it('close_ClosedVault_BlocksFurtherEditsLikeBackend', async () => {
    await close(1)
    expect((await call(axiosClient.put('/owner/vaults/1', { name: 'Kho' }))).status).toBe(409)
  })

  it('close_ExecutorRole_Returns403', async () => {
    const executor = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')
    await axiosClient.post('/auth/login', { email: executor.email, password: executor.password })
    expect((await close(1)).status).toBe(403)
  })
})
