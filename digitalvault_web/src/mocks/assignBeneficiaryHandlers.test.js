import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, resetMockDb } from './db'
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

describe('mock assign beneficiary is active immediately like the current backend', () => {
  it('post_NewBeneficiary_ReturnsActiveStatus', async () => {
    const result = await assign('long.tran@example.com', 40)
    expect(result.status).toBe(201)
    expect(result.data).toMatchObject({ assetId: 4, fullName: 'Trần Bảo Long', allocation: 40, status: 'Active' })
  })

  it('get_AssignedBeneficiary_IsListedAsActive', async () => {
    await assign('long.tran@example.com', 40)
    expect(await rows()).toEqual([expect.objectContaining({ allocation: 40, status: 'Active' })])
  })

  it('post_SameUserTwice_Returns409WithBackendMessage', async () => {
    await assign('long.tran@example.com', 40)
    const result = await assign('long.tran@example.com', 10)
    expect(result.status).toBe(409)
    expect(result.message).toBe('This user is already a pending or active beneficiary of the asset.')
  })

  it('post_TotalOverHundred_Returns409WithBackendMessage', async () => {
    await assign('long.tran@example.com', 70)
    const result = await assign('quan.le@example.com', 40)
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
