import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, resetMockDb } from './db'
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

const createSecondVault = async () => (await axiosClient.post('/owner/vaults', { name: 'Kho thứ hai', description: '' })).data.vaultId

describe('mock executor candidates', () => {
  it('get_Candidates_ReturnsThreeProfilesWithContactInfo', async () => {
    const result = await call(axiosClient.get('/owner/executors'))
    expect(result.status).toBe(200)
    expect(result.data).toHaveLength(3)
    expect(Object.keys(result.data[0]).sort()).toEqual(['address', 'email', 'executorId', 'fullName', 'hotline', 'licenseNumber', 'organization'])
    expect(result.data.map((e) => e.executorId)).toContain(5)
  })

  it('get_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await call(axiosClient.get('/owner/executors'))).status).toBe(403)
  })
})

describe('mock vault executor', () => {
  it('get_SeededVault_ReturnsActiveExecutorWithContract', async () => {
    const result = await call(axiosClient.get('/owner/vaults/1/executor'))
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ vaultId: 1, executorId: 5, fullName: 'LS. Lê Hoàng Nam', status: 'Active', contractNumber: 'HD-UQ-2026-0001' })
    expect(typeof result.data.assignedAt).toBe('string')
  })

  it('get_VaultWithoutExecutor_Returns404', async () => {
    const vaultId = await createSecondVault()
    expect((await call(axiosClient.get(`/owner/vaults/${vaultId}/executor`))).status).toBe(404)
  })

  it('get_VaultOfSomeoneElse_Returns404', async () => {
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await call(axiosClient.get('/owner/vaults/1/executor'))).status).toBe(404)
  })

  it('put_NewAssignment_CreatesPendingAssignmentWithNewContract', async () => {
    const vaultId = await createSecondVault()
    const result = await call(axiosClient.put(`/owner/vaults/${vaultId}/executor`, { executorId: 21 }))
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ vaultId, executorId: 21, status: 'Pending' })
    expect(result.data.contractNumber).toMatch(/^HD-UQ-\d{4}-\d{4}$/)
    expect(result.data.contractNumber).not.toBe('HD-UQ-2026-0001')
  })

  it('put_ChangeExecutor_ReplacesAssignmentAndResetsToPending', async () => {
    const result = await call(axiosClient.put('/owner/vaults/1/executor', { executorId: 22 }))
    expect(result.data).toMatchObject({ executorId: 22, status: 'Pending' })
    expect((await axiosClient.get('/owner/vaults/1/executor')).data.executorId).toBe(22)
  })

  it('put_UnknownExecutor_Returns404', async () => {
    expect((await call(axiosClient.put('/owner/vaults/1/executor', { executorId: 999 }))).status).toBe(404)
  })

  it.each([[{}], [{ executorId: 'x' }], [{ executorId: 5, role: 'Admin' }]])('put_InvalidBody_Returns400', async (body) => {
    expect((await call(axiosClient.put('/owner/vaults/1/executor', body))).status).toBe(400)
  })

  it('put_UnknownVault_Returns404', async () => {
    expect((await call(axiosClient.put('/owner/vaults/999/executor', { executorId: 5 }))).status).toBe(404)
  })

  it('delete_ExistingAssignment_Returns204AndRemovesIt', async () => {
    expect((await call(axiosClient.delete('/owner/vaults/1/executor'))).status).toBe(204)
    expect((await call(axiosClient.get('/owner/vaults/1/executor'))).status).toBe(404)
  })

  it('delete_NoAssignment_Returns404', async () => {
    const vaultId = await createSecondVault()
    expect((await call(axiosClient.delete(`/owner/vaults/${vaultId}/executor`))).status).toBe(404)
  })

  it('accept_PendingAssignment_BecomesActive', async () => {
    await axiosClient.put('/owner/vaults/1/executor', { executorId: 22 })
    const result = await call(axiosClient.post('/owner/vaults/1/executor/accept'))
    expect(result.status).toBe(200)
    expect(result.data.status).toBe('Active')
  })

  it('accept_NoAssignment_Returns404', async () => {
    const vaultId = await createSecondVault()
    expect((await call(axiosClient.post(`/owner/vaults/${vaultId}/executor/accept`))).status).toBe(404)
  })
})
