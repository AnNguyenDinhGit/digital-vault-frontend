import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, resetMockDb, saveDb } from './db'
import { handlers } from './handlers'
import { createPendingRequest } from '../test/pendingRequest'

const server = setupServer(...handlers)
const EXECUTOR = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await axiosClient.post('/auth/login', { email: EXECUTOR.email, password: EXECUTOR.password })
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

// Hồ sơ do Owner tạo ở trạng thái chờ Executor tiếp nhận (đã đăng nhập lại bằng Executor)
let lastVaultId = 0
async function pendingRequest(status = 'Pending_Executor') {
  const created = await createPendingRequest(status)
  lastVaultId = created.vaultId
  return created.requestId
}
const accept = (id) => call(axiosClient.post(`/executor/handovers/${id}/accept`))
const decline = (id, body) => call(axiosClient.post(`/executor/handovers/${id}/decline`, body))

describe('mock executor accept', () => {
  it('accept_PendingExecutor_Returns200AndMovesToDraft', async () => {
    const id = await pendingRequest()
    const { status, data } = await accept(id)
    expect(status).toBe(200)
    expect(data).toMatchObject({ requestId: id, status: 'Draft' })
  })

  it('accept_Accepted_NotifiesOwner', async () => {
    const id = await pendingRequest()
    await accept(id)
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    const { data } = await axiosClient.get('/notifications')
    expect(data.items[0]).toMatchObject({ title: 'Executor accepted handover', type: 'Handover', isRead: false })
  })

  it.each(['Draft', 'Pending_Legal', 'Declined', 'Cancelled'])('accept_%s_Returns409', async (status) => {
    const id = await pendingRequest(status)
    const result = await accept(id)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Only an awaiting Executor request can be accepted.')
  })

  it('accept_VaultNoLongerReady_Returns409', async () => {
    const id = await pendingRequest()
    getDb().assets.filter((asset) => asset.vaultId === lastVaultId).forEach((asset) => (asset.documents = []))
    saveDb()
    const result = await accept(id)
    expect(result.status).toBe(409)
    expect(result.message).toBe('Every active asset needs documents and exactly 100 percent active allocation.')
  })

  it('accept_UnknownOrOtherExecutorRequest_Returns404', async () => {
    expect((await accept(999)).status).toBe(404)
    const id = await pendingRequest()
    getDb().handovers.find((item) => item.requestId === id).executorId = 21
    saveDb()
    expect((await accept(id)).status).toBe(404)
  })

  it('accept_OwnerRole_Returns403', async () => {
    const id = await pendingRequest()
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    expect((await accept(id)).status).toBe(403)
  })
})

describe('mock executor decline', () => {
  it('decline_WithReason_Returns200DeclinedAndCancelsCases', async () => {
    const id = await pendingRequest()
    const { status, data } = await decline(id, { reason: '  Hiện tại không thể tiếp nhận  ' })
    expect(status).toBe(200)
    expect(data.status).toBe('Declined')
    expect(data.cases.length).toBeGreaterThan(0)
    expect(data.cases.every((item) => item.status === 'Cancelled')).toBe(true)
  })

  it('decline_Declined_RevokesAssignmentSoVaultLeavesExecutorList', async () => {
    const id = await pendingRequest()
    await decline(id, { reason: 'Bận' })
    expect((await axiosClient.get('/executor/assignments')).data.map((item) => item.vaultId)).not.toContain(lastVaultId)
    expect((await call(axiosClient.post(`/executor/assignments/${lastVaultId}/handovers`))).status).toBe(403)
  })

  it('decline_Declined_NotifiesOwnerWithRequestNumberAndReason', async () => {
    const id = await pendingRequest()
    await decline(id, { reason: ' Bận công tác ' })
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    const { data } = await axiosClient.get('/notifications')
    expect(data.items[0]).toMatchObject({ title: 'Executor declined handover', message: `Handover #${id}: Bận công tác` })
  })

  it.each([[{}], [{ reason: '   ' }], [{ reason: 'x'.repeat(2001) }], [{ reason: 'ok', extra: 1 }]])('decline_InvalidBody_Returns400', async (body) => {
    const id = await pendingRequest()
    expect((await decline(id, body)).status).toBe(400)
  })

  it.each(['Draft', 'Declined', 'Approved'])('decline_%s_Returns409', async (status) => {
    const id = await pendingRequest(status)
    const result = await decline(id, { reason: 'Bận' })
    expect(result.status).toBe(409)
    expect(result.message).toBe('Only an awaiting Executor request can be declined.')
  })

  it('decline_Twice_SecondReturns409', async () => {
    const id = await pendingRequest()
    await decline(id, { reason: 'Bận' })
    expect((await decline(id, { reason: 'Lại bận' })).status).toBe(409)
  })

  it('decline_UnknownRequest_Returns404', async () => {
    expect((await decline(999, { reason: 'Bận' })).status).toBe(404)
  })

  it('decline_DeclinedRequest_StaysReadableForTheExecutor', async () => {
    const id = await pendingRequest()
    await decline(id, { reason: 'Bận' })
    expect((await call(axiosClient.get(`/executor/handovers/${id}`))).data.status).toBe('Declined')
  })
})

describe('mock notifications listing', () => {
  it('list_NewestFirstWithPageDto', async () => {
    const id = await pendingRequest()
    await accept(id)
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    const { data } = await axiosClient.get('/notifications')
    expect(data).toMatchObject({ page: 1, pageSize: 20 })
    expect(Array.isArray(data.items)).toBe(true)
  })

  it('markRead_Notification_Returns204AndSetsIsRead', async () => {
    const id = await pendingRequest()
    await accept(id)
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    const [first] = (await axiosClient.get('/notifications')).data.items
    expect((await call(axiosClient.post(`/notifications/${first.notificationId}/read`))).status).toBe(204)
    expect((await axiosClient.get('/notifications')).data.items[0].isRead).toBe(true)
  })

  it('markRead_UnknownNotification_Returns404', async () => {
    expect((await call(axiosClient.post('/notifications/999/read'))).status).toBe(404)
  })
})

describe('mock owner sees decline details like the backend', () => {
  it('ownerHandover_AfterDecline_ExposesExecutorNameReasonAndTime', async () => {
    const id = await pendingRequest()
    await decline(id, { reason: ' Bận công tác ' })
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    const { data } = await axiosClient.get(`/owner/handovers/${id}`)
    expect(data).toMatchObject({ status: 'Declined', executorId: 5, executorName: 'LS. Lê Hoàng Nam', declineReason: 'Bận công tác' })
    expect(new Date(data.declinedAt).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('ownerHandover_NotDeclined_HasNoDeclineFields', async () => {
    const id = await pendingRequest()
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    const { data } = await axiosClient.get(`/owner/handovers/${id}`)
    expect(data.executorName).toBe('LS. Lê Hoàng Nam')
    expect(data.declineReason).toBeUndefined()
  })

  it('executorHandover_ExecutorView_DoesNotExposeOwnerOnlyDeclineFields', async () => {
    const id = await pendingRequest()
    await decline(id, { reason: 'Bận' })
    const { data } = await axiosClient.get(`/executor/handovers/${id}`)
    expect(data.declineReason).toBeUndefined()
  })
})
