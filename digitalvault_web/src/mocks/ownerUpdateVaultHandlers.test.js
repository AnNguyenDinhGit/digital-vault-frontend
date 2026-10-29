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

const update = (vaultId, body) => call(axiosClient.put(`/owner/vaults/${vaultId}`, body))

describe('mock owner update vault', () => {
  it('update_ValidInput_Returns200WithTrimmedNameAndPersists', async () => {
    const { status, data } = await update(1, { name: '  Kho mới  ', description: 'Mô tả mới' })
    expect(status).toBe(200)
    expect(data).toEqual({ vaultId: 1, name: 'Kho mới', description: 'Mô tả mới', status: 'Active' })
    expect((await axiosClient.get('/owner/vaults/1')).data.name).toBe('Kho mới')
  })

  it('update_NullDescription_ClearsDescription', async () => {
    const { data } = await update(1, { name: 'Kho', description: null })
    expect(data.description).toBeNull()
  })

  it.each([
    ['BlankName', { name: ' ' }],
    ['NameTooLong', { name: 'a'.repeat(101) }],
    ['DescriptionTooLong', { name: 'Kho', description: 'a'.repeat(4001) }],
    ['UnknownField', { name: 'Kho', status: 'Closed' }],
  ])('update_%s_Returns400', async (_label, body) => {
    expect((await update(1, body)).status).toBe(400)
  })

  it('update_UnknownVault_Returns404', async () => {
    expect((await update(999, { name: 'Kho' })).status).toBe(404)
  })

  it('update_VaultOfAnotherOwner_Returns404', async () => {
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await update(1, { name: 'Chiếm kho' })).status).toBe(404)
  })

  it('update_VaultWithOpenHandover_Returns409Protected', async () => {
    getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status: 'Draft', initiatedAt: new Date().toISOString(), documents: [], cases: [] })
    saveDb()
    const result = await update(1, { name: 'Kho' })
    expect(result.status).toBe(409)
    expect(result.message).toBe('Vault is inactive or has a protected handover record.')
  })

  it('update_VaultWithOnlyCancelledHandover_Returns200', async () => {
    getDb().handovers.push({ requestId: 50, vaultId: 1, executorId: 5, status: 'Cancelled', initiatedAt: new Date().toISOString(), documents: [], cases: [] })
    saveDb()
    expect((await update(1, { name: 'Kho' })).status).toBe(200)
  })

  it('update_ClosedVault_Returns409', async () => {
    getDb().vaults[0].status = 'Closed'
    saveDb()
    expect((await update(1, { name: 'Kho' })).status).toBe(409)
  })

  it('update_ExecutorRole_Returns403', async () => {
    const executor = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')
    await axiosClient.post('/auth/login', { email: executor.email, password: executor.password })
    expect((await update(1, { name: 'Kho' })).status).toBe(403)
  })
})
