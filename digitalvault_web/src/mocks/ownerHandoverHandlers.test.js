import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, resetMockDb } from './db'
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

const loginAs = (account) => axiosClient.post('/auth/login', { email: account.email, password: account.password })

// Executor tạo hồ sơ Draft cho kho 1 rồi quay lại tài khoản Owner
async function openHandoverAsExecutor() {
  await loginAs(EXECUTOR)
  const { data } = await axiosClient.post('/executor/assignments/1/handovers')
  await loginAs(DEMO_ACCOUNT)
  return data.requestId
}

describe('mock owner handover list', () => {
  it('get_NoHandover_ReturnsEmptyPage', async () => {
    const result = await call(axiosClient.get('/owner/handovers'))
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ page: 1, pageSize: 20, items: [] })
  })

  it('get_WithHandover_ReturnsItInPageDto', async () => {
    const id = await openHandoverAsExecutor()
    const { data } = await axiosClient.get('/owner/handovers')
    expect(data.items.map((item) => item.requestId)).toEqual([id])
    expect(data.items[0]).toMatchObject({ vaultId: 1, status: 'Draft', requestType: 'Inheritance' })
  })

  it('get_StatusFilter_KeepsOnlyMatchingHandovers', async () => {
    await openHandoverAsExecutor()
    expect((await axiosClient.get('/owner/handovers', { params: { status: 'Approved' } })).data.items).toEqual([])
    expect((await axiosClient.get('/owner/handovers', { params: { status: 'Draft' } })).data.items).toHaveLength(1)
  })

  it('get_PageSize_LimitsItemsAndEchoesPaging', async () => {
    await openHandoverAsExecutor()
    getDb().handovers[0].status = 'Cancelled'
    await loginAs(EXECUTOR)
    await axiosClient.post('/executor/assignments/1/handovers')
    await loginAs(DEMO_ACCOUNT)
    const { data } = await axiosClient.get('/owner/handovers', { params: { page: 1, pageSize: 1 } })
    expect(data).toMatchObject({ page: 1, pageSize: 1 })
    expect(data.items).toHaveLength(1)
  })

  it('get_OtherOwner_DoesNotSeeHandoversOfThisVault', async () => {
    await openHandoverAsExecutor()
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await axiosClient.get('/owner/handovers')).data.items).toEqual([])
  })

  it('get_NonOwnerRole_Returns403', async () => {
    await loginAs(EXECUTOR)
    expect((await call(axiosClient.get('/owner/handovers'))).status).toBe(403)
  })
})

describe('mock cancel handover', () => {
  it('post_DraftHandover_Returns204AndMarksItCancelled', async () => {
    const id = await openHandoverAsExecutor()
    expect((await call(axiosClient.post(`/owner/handovers/${id}/cancel`))).status).toBe(204)
    expect(getDb().handovers[0].status).toBe('Cancelled')
  })

  it('post_RejectedHandover_CanBeCancelled', async () => {
    const id = await openHandoverAsExecutor()
    getDb().handovers[0].status = 'Rejected'
    expect((await call(axiosClient.post(`/owner/handovers/${id}/cancel`))).status).toBe(204)
  })

  it.each([['Pending_Legal'], ['Approved'], ['In_Progress'], ['Completed'], ['Cancelled']])('post_%sHandover_Returns409', async (status) => {
    const id = await openHandoverAsExecutor()
    getDb().handovers[0].status = status
    expect((await call(axiosClient.post(`/owner/handovers/${id}/cancel`))).status).toBe(409)
  })

  it('post_UnknownHandover_Returns404', async () => {
    expect((await call(axiosClient.post('/owner/handovers/999/cancel'))).status).toBe(404)
  })

  it('post_HandoverOfAnotherOwner_Returns404', async () => {
    const id = await openHandoverAsExecutor()
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await call(axiosClient.post(`/owner/handovers/${id}/cancel`))).status).toBe(404)
  })

  it('post_NonOwnerRole_Returns403', async () => {
    const id = await openHandoverAsExecutor()
    await loginAs(EXECUTOR)
    expect((await call(axiosClient.post(`/owner/handovers/${id}/cancel`))).status).toBe(403)
  })
})

describe('mock vault lock while a handover exists', () => {
  const assetBody = { name: 'Tên mới', type: 'BankAccount', description: null }

  it('mutations_WithOpenHandover_Return409LikeBackend', async () => {
    await openHandoverAsExecutor()
    const attempts = [
      call(axiosClient.put('/owner/assets/2', assetBody)),
      call(axiosClient.post('/owner/assets/2/revoke')),
      call(axiosClient.put('/owner/assets/1/allocations/1', { allocation: 30 })),
      call(axiosClient.post('/owner/assets/1/allocations/1/revoke')),
      call(axiosClient.post('/owner/assets/4/beneficiaries', { email: 'long.tran@example.com', allocation: 50 })),
    ]
    const results = await Promise.all(attempts)
    expect(results.map((item) => item.status)).toEqual([409, 409, 409, 409, 409])
    expect(results[0].message).toContain('Handover records protect this vault')
  })

  it('reads_WithOpenHandover_StillWork', async () => {
    await openHandoverAsExecutor()
    expect((await call(axiosClient.get('/owner/assets'))).status).toBe(200)
    expect((await call(axiosClient.get('/owner/assets/1/allocations'))).status).toBe(200)
  })

  it('mutations_AfterCancellingHandover_WorkAgain', async () => {
    const id = await openHandoverAsExecutor()
    await axiosClient.post(`/owner/handovers/${id}/cancel`)
    expect((await call(axiosClient.put('/owner/assets/2', assetBody))).status).toBe(200)
    expect((await call(axiosClient.post('/owner/assets/1/allocations/1/revoke'))).status).toBe(200)
  })
})
