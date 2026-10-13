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

const loginAsFreshOwner = async () => {
  await axiosClient.post('/auth/register', {
    fullName: 'Chủ Mới',
    email: 'moi@example.com',
    password: 'Registration123!',
    confirmPassword: 'Registration123!',
  })
  await axiosClient.post('/auth/login', { email: 'moi@example.com', password: 'Registration123!' })
}

describe('mock proof of life', () => {
  it('get_DemoOwner_ReturnsSeededConfigWithActiveStatus', async () => {
    const result = await call(axiosClient.get('/owner/proof-of-life'))
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ frequencyDays: 30, gracePeriodDays: 7, status: 'Active', missedCount: 0 })
    expect(Object.keys(result.data).sort()).toEqual(
      ['frequencyDays', 'gracePeriodDays', 'lastPingAt', 'missedCount', 'nextPingDue', 'status'].sort(),
    )
  })

  it('get_OwnerWithoutConfig_Returns404', async () => {
    await loginAsFreshOwner()
    expect((await call(axiosClient.get('/owner/proof-of-life'))).status).toBe(404)
  })

  it('get_NotLoggedIn_Returns401', async () => {
    await axiosClient.post('/auth/logout')
    expect((await call(axiosClient.get('/owner/proof-of-life'))).status).toBe(401)
  })

  it('get_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await call(axiosClient.get('/owner/proof-of-life'))).status).toBe(403)
  })

  it('put_NewOwner_CreatesConfigWithFreshPing', async () => {
    await loginAsFreshOwner()
    const saved = await call(axiosClient.put('/owner/proof-of-life', { frequencyDays: 14, gracePeriodDays: 3 }))
    expect(saved.status).toBe(200)
    expect(saved.data).toMatchObject({ frequencyDays: 14, gracePeriodDays: 3, status: 'Active', missedCount: 0 })
    const again = await call(axiosClient.get('/owner/proof-of-life'))
    expect(again.data.frequencyDays).toBe(14)
  })

  it('put_ExistingConfig_UpdatesValuesButKeepsLastPing', async () => {
    const before = (await axiosClient.get('/owner/proof-of-life')).data
    const saved = await call(axiosClient.put('/owner/proof-of-life', { frequencyDays: 60, gracePeriodDays: 14 }))
    expect(saved.data).toMatchObject({ frequencyDays: 60, gracePeriodDays: 14, lastPingAt: before.lastPingAt })
  })

  it.each([
    [{ frequencyDays: 0, gracePeriodDays: 7 }],
    [{ frequencyDays: 30, gracePeriodDays: -1 }],
    [{ frequencyDays: 7.5, gracePeriodDays: 7 }],
    [{ frequencyDays: '30', gracePeriodDays: 7 }],
    [{ frequencyDays: 366, gracePeriodDays: 7 }],
    [{ frequencyDays: 30, gracePeriodDays: 91 }],
    [{ frequencyDays: 30, gracePeriodDays: 7, status: 'Active' }],
  ])('put_InvalidBody_Returns400', async (body) => {
    expect((await call(axiosClient.put('/owner/proof-of-life', body))).status).toBe(400)
  })

  it('put_AlreadyTriggered_Returns409', async () => {
    await axiosClient.post('/owner/proof-of-life/simulate', { days: 40 })
    const result = await call(axiosClient.put('/owner/proof-of-life', { frequencyDays: 30, gracePeriodDays: 7 }))
    expect(result.status).toBe(409)
  })

  it('ping_Configured_ResetsLastPingAndStaysActive', async () => {
    await axiosClient.post('/owner/proof-of-life/simulate', { days: 10 })
    const before = (await axiosClient.get('/owner/proof-of-life')).data
    const result = await call(axiosClient.post('/owner/proof-of-life/ping'))
    expect(result.status).toBe(200)
    expect(result.data.status).toBe('Active')
    expect(new Date(result.data.lastPingAt).getTime()).toBeGreaterThan(new Date(before.lastPingAt).getTime())
  })

  it('ping_DuringWarning_IncreasesMissedCount', async () => {
    await axiosClient.post('/owner/proof-of-life/simulate', { days: 25 })
    expect((await axiosClient.get('/owner/proof-of-life')).data.status).toBe('Warning')
    const result = await call(axiosClient.post('/owner/proof-of-life/ping'))
    expect(result.data).toMatchObject({ status: 'Active', missedCount: 1 })
  })

  it('ping_AlreadyTriggered_Returns409', async () => {
    await axiosClient.post('/owner/proof-of-life/simulate', { days: 40 })
    expect((await call(axiosClient.post('/owner/proof-of-life/ping'))).status).toBe(409)
  })

  it('ping_NoConfig_Returns404', async () => {
    await loginAsFreshOwner()
    expect((await call(axiosClient.post('/owner/proof-of-life/ping'))).status).toBe(404)
  })

  it('simulate_TenDaysLater_ChangesStatusByElapsedTime', async () => {
    const states = []
    for (const days of [10, 15, 15]) {
      await axiosClient.post('/owner/proof-of-life/simulate', { days })
      states.push((await axiosClient.get('/owner/proof-of-life')).data.status)
    }
    // Đã trôi 10 + 10 ngày seed = 20 (Active), rồi 35 (Warning), rồi 50 (Triggered)
    expect(states).toEqual(['Active', 'Warning', 'Triggered'])
  })

  it('simulate_InvalidDays_Returns400', async () => {
    expect((await call(axiosClient.post('/owner/proof-of-life/simulate', { days: 0 }))).status).toBe(400)
    expect((await call(axiosClient.post('/owner/proof-of-life/simulate', { days: 'x' }))).status).toBe(400)
  })
})
