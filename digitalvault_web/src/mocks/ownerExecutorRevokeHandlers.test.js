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

const revoke = (vaultId) => call(axiosClient.post(`/owner/vaults/${vaultId}/executor/revoke`))
const addHandover = (status) => {
  getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status, initiatedAt: new Date().toISOString(), documents: [], cases: [{ handoverId: 1, assetId: 1, beneficiaryId: 2, status: 'Pending' }] })
  saveDb()
}

describe('mock owner revoke executor like the backend', () => {
  it('revoke_ActiveAssignment_Returns204AndGetShowsRevokedRecord', async () => {
    expect((await revoke(1)).status).toBe(204)
    const { status, data } = await call(axiosClient.get('/owner/vaults/1/executor'))
    expect(status).toBe(200)
    expect(data).toMatchObject({ vaultId: 1, executorId: 5, status: 'Revoked' })
  })

  it('revoke_AutoAssigned_Works', async () => {
    getDb().executorAssignments[1].status = 'AutoAssigned'
    saveDb()
    expect((await revoke(1)).status).toBe(204)
  })

  it('revoke_Twice_SecondReturns404NoActiveAssignment', async () => {
    await revoke(1)
    const result = await revoke(1)
    expect(result.status).toBe(404)
    expect(result.message).toBe('Active Executor assignment not found.')
  })

  it('revoke_VaultWithoutAssignment_Returns404', async () => {
    const { data: vault } = await axiosClient.post('/owner/vaults', { name: 'Kho thứ hai', description: '' })
    expect((await revoke(vault.vaultId)).status).toBe(404)
    expect((await call(axiosClient.get(`/owner/vaults/${vault.vaultId}/executor`))).status).toBe(404)
  })

  it('revoke_PendingExecutorHandover_CancelsItAndItsCases', async () => {
    addHandover('Pending_Executor')
    expect((await revoke(1)).status).toBe(204)
    const handover = getDb().handovers[0]
    expect(handover.status).toBe('Cancelled')
    expect(handover.cases.every((item) => item.status === 'Cancelled')).toBe(true)
  })

  it('revoke_Revoked_NotifiesTheExecutor', async () => {
    await revoke(1)
    await axiosClient.post('/auth/login', { email: EXECUTOR.email, password: EXECUTOR.password })
    const { data } = await axiosClient.get('/notifications')
    expect(data.items[0]).toMatchObject({ type: 'Assignment', title: 'Vault assignment revoked' })
  })

  it.each(['Draft', 'Pending_Legal', 'Additional_Info', 'Rejected', 'Approved', 'In_Progress', 'Completed'])('revoke_HandoverIn%s_Returns409', async (status) => {
    addHandover(status)
    const result = await revoke(1)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Executor cannot be revoked after handover acceptance or processing.')
  })

  it.each(['Cancelled', 'Declined'])('revoke_OnlyHandover%s_IsNotBlocking', async (status) => {
    addHandover(status)
    expect((await revoke(1)).status).toBe(204)
  })

  it('revoke_ClosedVault_Returns409', async () => {
    getDb().vaults[0].status = 'Closed'
    saveDb()
    expect((await revoke(1)).status).toBe(409)
  })

  it('revoke_UnknownVaultOrOtherOwner_Returns404', async () => {
    expect((await revoke(999)).status).toBe(404)
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await revoke(1)).status).toBe(404)
  })

  it('revoke_ExecutorRole_Returns403', async () => {
    await axiosClient.post('/auth/login', { email: EXECUTOR.email, password: EXECUTOR.password })
    expect((await revoke(1)).status).toBe(403)
  })
})
