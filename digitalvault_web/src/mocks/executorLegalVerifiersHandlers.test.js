import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, resetMockDb, saveDb } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)
const EXECUTOR = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')
const VERIFIER = ROLE_ACCOUNTS.find((account) => account.role === 'LegalVerifier')

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

const verifiersOf = (requestId) => call(axiosClient.get(`/executor/handovers/${requestId}/legal-verifiers`))

async function createRequest() {
  const { data } = await axiosClient.post('/executor/assignments/1/handovers')
  return data.requestId
}

describe('mock executor legal verifiers', () => {
  it('list_OwnRequest_ReturnsActiveLegalVerifiersWithIdAndName', async () => {
    const id = await createRequest()
    const { status, data } = await verifiersOf(id)
    expect(status).toBe(200)
    expect(data).toEqual([{ userId: VERIFIER.userId, fullName: VERIFIER.fullName }])
  })

  it('list_VerifierIsAlsoBeneficiaryOfRequest_IsExcluded', async () => {
    const id = await createRequest()
    getDb().users.find((user) => user.userId === 2).roles.push('LegalVerifier')
    saveDb()
    const { data } = await verifiersOf(id)
    expect(data.map((item) => item.userId)).toEqual([VERIFIER.userId])
  })

  it('list_VerifierIsOwnerOfVault_IsExcluded', async () => {
    const id = await createRequest()
    getDb().users.find((user) => user.userId === DEMO_ACCOUNT.userId).roles.push('LegalVerifier')
    saveDb()
    const { data } = await verifiersOf(id)
    expect(data.map((item) => item.userId)).toEqual([VERIFIER.userId])
  })

  it('list_VerifierIsTheExecutorHimself_IsExcluded', async () => {
    const id = await createRequest()
    getDb().users.find((user) => user.userId === EXECUTOR.userId).roles.push('LegalVerifier')
    saveDb()
    const { data } = await verifiersOf(id)
    expect(data.map((item) => item.userId)).toEqual([VERIFIER.userId])
  })

  it('list_InactiveVerifier_IsExcluded', async () => {
    const id = await createRequest()
    getDb().users.find((user) => user.userId === VERIFIER.userId).status = 'Locked'
    saveDb()
    expect((await verifiersOf(id)).data).toEqual([])
  })

  it('list_UnknownRequest_Returns404', async () => {
    expect((await verifiersOf(999)).status).toBe(404)
  })

  it('list_RequestOfAnotherExecutor_Returns404', async () => {
    const id = await createRequest()
    getDb().handovers.find((item) => item.requestId === id).executorId = 21
    saveDb()
    expect((await verifiersOf(id)).status).toBe(404)
  })

  it('list_OwnerRole_Returns403', async () => {
    const id = await createRequest()
    await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
    expect((await verifiersOf(id)).status).toBe(403)
  })
})
