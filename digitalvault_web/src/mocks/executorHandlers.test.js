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

  it('put_NewAssignment_Returns204AndCreatesActiveAssignmentWithNewContract', async () => {
    const vaultId = await createSecondVault()
    expect((await call(axiosClient.put(`/owner/vaults/${vaultId}/executor`, { executorId: 21 }))).status).toBe(204)
    const assignment = (await axiosClient.get(`/owner/vaults/${vaultId}/executor`)).data
    expect(assignment).toMatchObject({ vaultId, executorId: 21, status: 'Active' })
    expect(assignment.contractNumber).toMatch(/^HD-UQ-\d{4}-\d{4}$/)
    expect(assignment.contractNumber).not.toBe('HD-UQ-2026-0001')
  })

  it('put_ChangeExecutor_ReplacesAssignmentAndKeepsItActive', async () => {
    expect((await call(axiosClient.put('/owner/vaults/1/executor', { executorId: 22 }))).status).toBe(204)
    expect((await axiosClient.get('/owner/vaults/1/executor')).data).toMatchObject({ executorId: 22, status: 'Active' })
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

  it('revoke_ExistingAssignment_Returns204AndGetShowsRevokedStatus', async () => {
    expect((await call(axiosClient.post('/owner/vaults/1/executor/revoke'))).status).toBe(204)
    expect((await call(axiosClient.get('/owner/vaults/1/executor'))).data.status).toBe('Revoked')
  })

  it('revoke_NoAssignment_Returns404', async () => {
    const vaultId = await createSecondVault()
    expect((await call(axiosClient.post(`/owner/vaults/${vaultId}/executor/revoke`))).status).toBe(404)
  })
})
