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
    return { status: response.status, data: response.data, message: undefined }
  } catch (error) {
    return { status: error.status, message: error.message }
  }
}

// Tài sản 4 chưa có ai; Trần Bảo Long (long.tran) và Lê Minh Quân (quan.le) là tài khoản có sẵn
const assign = (email, allocation, assetId = 4) => call(axiosClient.post(`/owner/assets/${assetId}/beneficiaries`, { email, allocation }))
const rows = async (assetId = 4) => (await axiosClient.get('/owner/beneficiaries', { params: { assetId } })).data

describe('mock assign beneficiary creates a pending allocation like the backend', () => {
  it('post_NewBeneficiary_ReturnsPendingStatus', async () => {
    const result = await assign('long.tran@example.com', 40)
    expect(result.status).toBe(201)
    expect(result.data).toMatchObject({ assetId: 4, fullName: 'Trần Bảo Long', allocation: 40, status: 'Pending' })
  })

  it('get_PendingBeneficiary_IsListedWithPendingStatus', async () => {
    await assign('long.tran@example.com', 40)
    expect(await rows()).toEqual([expect.objectContaining({ allocation: 40, status: 'Pending' })])
  })

  it('post_SameUserWhileStillPending_Returns409WithBackendMessage', async () => {
    await assign('long.tran@example.com', 40)
    const result = await assign('long.tran@example.com', 10)
    expect(result.status).toBe(409)
    expect(result.message).toBe('This user is already a pending or active beneficiary of the asset.')
  })

  it('post_PendingAllocationsDoNotCountTowardsTheTotal', async () => {
    await assign('long.tran@example.com', 80)
    expect((await assign('quan.le@example.com', 100)).status).toBe(201)
  })

  it('post_ActiveAllocationsStillCountTowardsTheTotal', async () => {
    const result = await assign('quan.le@example.com', 10, 1)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Total active beneficiary allocation cannot exceed 100 percent.')
  })

  it('post_AfterRevokedAllocation_CanBeAssignedAgain', async () => {
    const { data } = await axiosClient.get('/owner/assets/1/allocations')
    const long = data.find((row) => row.beneficiaryId === 2)
    await axiosClient.post(`/owner/assets/1/allocations/${long.assignmentId}/revoke`)
    expect((await assign('long.tran@example.com', 40, 1)).status).toBe(201)
  })
})

describe('mock pending allocations cannot be edited until accepted', () => {
  async function pendingAssignmentId() {
    await assign('long.tran@example.com', 40)
    return (await axiosClient.get('/owner/assets/4/allocations')).data[0].assignmentId
  }

  it('put_PendingAssignment_Returns409', async () => {
    const id = await pendingAssignmentId()
    expect((await call(axiosClient.put(`/owner/assets/4/allocations/${id}`, { allocation: 20 }))).status).toBe(409)
  })

  it('post_RevokePendingAssignment_Returns409', async () => {
    const id = await pendingAssignmentId()
    expect((await call(axiosClient.post(`/owner/assets/4/allocations/${id}/revoke`))).status).toBe(409)
  })
})

describe('mock simulate beneficiary acceptance (mock only)', () => {
  it('post_PendingBeneficiary_BecomesActiveAndCountsTowardsTotal', async () => {
    await assign('long.tran@example.com', 70)
    const result = await call(axiosClient.post('/owner/assets/4/beneficiaries/2/simulate-accept'))
    expect(result.status).toBe(200)
    expect(result.data.status).toBe('Active')
    expect((await assign('quan.le@example.com', 50)).status).toBe(409)
  })

  it('post_NoPendingAssignment_Returns404', async () => {
    expect((await call(axiosClient.post('/owner/assets/4/beneficiaries/2/simulate-accept'))).status).toBe(404)
  })

  it('post_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await call(axiosClient.post('/owner/assets/4/beneficiaries/2/simulate-accept'))).status).toBe(403)
  })
})
