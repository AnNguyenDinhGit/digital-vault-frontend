import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { installActivityRecorder } from './activityRecorder'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, resetMockDb } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)
let ejectRecorder

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  ejectRecorder = installActivityRecorder(axiosClient)
})
beforeEach(async () => {
  resetMockDb()
  await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  ejectRecorder()
  server.close()
})

const call = async (promise) => {
  try {
    const response = await promise
    return { status: response.status, data: response.data }
  } catch (error) {
    return { status: error.status, message: error.message }
  }
}

describe('mock activity logs', () => {
  it('get_DemoOwner_ReturnsSeededLogsNewestFirstWithAuditLogShape', async () => {
    const result = await call(axiosClient.get('/owner/activity-logs'))
    expect(result.status).toBe(200)
    expect(result.data.length).toBeGreaterThanOrEqual(12)
    const times = result.data.map((l) => new Date(l.timestamp).getTime())
    expect(times).toEqual([...times].sort((a, b) => b - a))
    expect(Object.keys(result.data[0]).sort()).toEqual(['action', 'entityId', 'entityType', 'ipAddress', 'logId', 'result', 'timestamp'])
  })

  it('get_SeededLogs_IncludeFailedLoginAndPendingLegalUpload', async () => {
    const { data } = await axiosClient.get('/owner/activity-logs')
    expect(data.some((l) => l.action === 'Login' && l.result === 'Failed')).toBe(true)
    expect(data.some((l) => l.action === 'UploadAssetDocument' && l.result === 'Pending_Legal')).toBe(true)
  })

  it('get_OtherOwner_DoesNotSeeDemoOwnerLogs', async () => {
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    const { data } = await axiosClient.get('/owner/activity-logs')
    expect(data.filter((l) => l.action === 'CreateVault')).toHaveLength(0)
  })

  it('get_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await call(axiosClient.get('/owner/activity-logs'))).status).toBe(403)
  })

  it('get_NotLoggedIn_Returns401', async () => {
    await axiosClient.post('/auth/logout')
    expect((await call(axiosClient.get('/owner/activity-logs'))).status).toBe(401)
  })

  it('recorder_CreateVaultThroughApi_AppearsAtTopOfLogs', async () => {
    const created = await axiosClient.post('/owner/vaults', { name: 'Kho nhật ký', description: '' })
    const { data } = await axiosClient.get('/owner/activity-logs')
    expect(data[0]).toMatchObject({ action: 'CreateVault', entityType: 'DigitalVault', entityId: created.data.vaultId, result: 'Success' })
  })

  it('recorder_ProofOfLifePing_AppearsInLogs', async () => {
    await axiosClient.post('/owner/proof-of-life/ping')
    const { data } = await axiosClient.get('/owner/activity-logs')
    expect(data[0].action).toBe('PingProofOfLife')
  })

  it('recorder_FailedRequest_IsNotRecorded', async () => {
    const before = (await axiosClient.get('/owner/activity-logs')).data.length
    await call(axiosClient.post('/owner/vaults', { name: '   ' }))
    const after = (await axiosClient.get('/owner/activity-logs')).data.length
    expect(after).toBe(before)
  })
})
