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

// Tài sản 1: Trần Bảo Long (id 2) hưởng 40%, Nguyễn Thị Mai (id 3) hưởng 60%
const allocations = async (assetId) => (await axiosClient.get(`/owner/assets/${assetId}/allocations`)).data
const assignmentOf = async (assetId, beneficiaryId) => (await allocations(assetId)).find((row) => row.beneficiaryId === beneficiaryId)
const update = async (assetId, beneficiaryId, body) => {
  const assignment = await assignmentOf(assetId, beneficiaryId)
  return call(axiosClient.put(`/owner/assets/${assetId}/allocations/${assignment?.assignmentId ?? 999}`, body))
}
const revoke = async (assetId, beneficiaryId) => {
  const assignment = await assignmentOf(assetId, beneficiaryId)
  return call(axiosClient.post(`/owner/assets/${assetId}/allocations/${assignment?.assignmentId ?? 999}/revoke`))
}

describe('mock list allocations', () => {
  it('get_Asset_ReturnsAssignmentDtoWithAssignmentId', async () => {
    const result = await call(axiosClient.get('/owner/assets/1/allocations'))
    expect(result.status).toBe(200)
    expect(result.data).toHaveLength(2)
    expect(Object.keys(result.data[0]).sort()).toEqual(['allocation', 'assetId', 'assignmentId', 'beneficiaryId', 'fullName', 'status'])
    expect(result.data.find((row) => row.beneficiaryId === 2)).toMatchObject({ fullName: 'Trần Bảo Long', allocation: 40, status: 'Active' })
  })

  it('get_AssignmentIdsAreUnique', async () => {
    const ids = [...(await allocations(1)), ...(await allocations(3))].map((row) => row.assignmentId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('get_UnknownAsset_Returns404', async () => {
    expect((await call(axiosClient.get('/owner/assets/999/allocations'))).status).toBe(404)
  })

  it('get_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await call(axiosClient.get('/owner/assets/1/allocations'))).status).toBe(403)
  })
})

describe('mock update allocation', () => {
  it('put_LowerAllocation_ReturnsAssignmentAndPersists', async () => {
    const result = await update(1, 2, { allocation: 30 })
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ assetId: 1, beneficiaryId: 2, fullName: 'Trần Bảo Long', allocation: 30, status: 'Active' })
    expect((await assignmentOf(1, 2)).allocation).toBe(30)
  })

  it('put_RaiseAllocationWithinRemaining_Succeeds', async () => {
    await update(1, 2, { allocation: 20 })
    expect((await update(1, 3, { allocation: 80 })).status).toBe(200)
  })

  it('put_TotalWouldExceed100_Returns409', async () => {
    expect((await update(1, 2, { allocation: 50 })).status).toBe(409)
    expect((await assignmentOf(1, 2)).allocation).toBe(40)
  })

  it.each([[{ allocation: 0 }], [{ allocation: 100.5 }], [{ allocation: 1.234 }], [{ allocation: '40' }], [{}], [{ allocation: 40, role: 'x' }]])(
    'put_InvalidBody_Returns400',
    async (body) => {
      expect((await update(1, 2, body)).status).toBe(400)
    },
  )

  it('put_UnknownAssignment_Returns404', async () => {
    expect((await call(axiosClient.put('/owner/assets/1/allocations/9999', { allocation: 10 }))).status).toBe(404)
  })

  it('put_RevokedAssignment_Returns409', async () => {
    const assignment = await assignmentOf(1, 2)
    await revoke(1, 2)
    expect((await call(axiosClient.put(`/owner/assets/1/allocations/${assignment.assignmentId}`, { allocation: 10 }))).status).toBe(409)
  })

  it('put_AssetOfSomeoneElse_Returns404', async () => {
    const assignment = await assignmentOf(1, 2)
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await call(axiosClient.put(`/owner/assets/1/allocations/${assignment.assignmentId}`, { allocation: 10 }))).status).toBe(404)
  })

  it('put_NonOwnerRole_Returns403', async () => {
    const assignment = await assignmentOf(1, 2)
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await call(axiosClient.put(`/owner/assets/1/allocations/${assignment.assignmentId}`, { allocation: 10 }))).status).toBe(403)
  })
})

describe('mock revoke allocation', () => {
  it('post_Existing_ReturnsRevokedAssignmentAndFreesTheAllocation', async () => {
    const result = await revoke(1, 2)
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ beneficiaryId: 2, status: 'Revoked' })
    // Phần 40% đã trả về chưa phân bổ nên có thể nâng người còn lại lên 100%
    expect((await update(1, 3, { allocation: 100 })).status).toBe(200)
  })

  it('post_BeneficiaryList_KeepsRevokedRowWithRevokedStatusLikeBackend', async () => {
    await revoke(1, 2)
    const rows = (await axiosClient.get('/owner/beneficiaries', { params: { assetId: 1 } })).data
    expect(rows.find((row) => row.beneficiaryId === 2).status).toBe('Revoked')
    expect(rows.find((row) => row.beneficiaryId === 3).status).toBe('Active')
  })

  it('post_OnlyAffectsThatAsset', async () => {
    await revoke(1, 2)
    expect((await assignmentOf(3, 2)).status).toBe('Active')
  })

  it('post_Twice_SecondReturns409', async () => {
    await revoke(1, 2)
    expect((await revoke(1, 2)).status).toBe(409)
  })

  it('post_UnknownAssignment_Returns404', async () => {
    expect((await call(axiosClient.post('/owner/assets/1/allocations/9999/revoke'))).status).toBe(404)
  })
})
