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
const update = (assetId, beneficiaryId, body) => call(axiosClient.put(`/owner/assets/${assetId}/beneficiaries/${beneficiaryId}`, body))
const allocationOf = async (assetId, beneficiaryId) =>
  (await axiosClient.get('/owner/beneficiaries', { params: { assetId } })).data.find((row) => row.beneficiaryId === beneficiaryId)?.allocation

describe('mock update allocation', () => {
  it('put_LowerAllocation_ReturnsRowAndPersists', async () => {
    const result = await update(1, 2, { allocation: 30 })
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ assetId: 1, beneficiaryId: 2, fullName: 'Trần Bảo Long', allocation: 30, status: 'Active' })
    expect(await allocationOf(1, 2)).toBe(30)
  })

  it('put_RaiseAllocationWithinRemaining_Succeeds', async () => {
    await update(1, 2, { allocation: 20 })
    expect((await update(1, 3, { allocation: 80 })).status).toBe(200)
  })

  it('put_TotalWouldExceed100_Returns409', async () => {
    expect((await update(1, 2, { allocation: 50 })).status).toBe(409)
    expect(await allocationOf(1, 2)).toBe(40)
  })

  it.each([[{ allocation: 0 }], [{ allocation: 100.5 }], [{ allocation: 1.234 }], [{ allocation: '40' }], [{}], [{ allocation: 40, role: 'x' }]])(
    'put_InvalidBody_Returns400',
    async (body) => {
      expect((await update(1, 2, body)).status).toBe(400)
    },
  )

  it('put_BeneficiaryNotOnAsset_Returns404', async () => {
    expect((await update(1, 4, { allocation: 10 })).status).toBe(404)
  })

  it('put_UnknownAsset_Returns404', async () => {
    expect((await update(999, 2, { allocation: 10 })).status).toBe(404)
  })

  it('put_AssetOfSomeoneElse_Returns404', async () => {
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await update(1, 2, { allocation: 10 })).status).toBe(404)
  })

  it('put_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await update(1, 2, { allocation: 10 })).status).toBe(403)
  })
})

describe('mock remove beneficiary', () => {
  it('delete_Existing_Returns204AndFreesTheAllocation', async () => {
    expect((await call(axiosClient.delete('/owner/assets/1/beneficiaries/2'))).status).toBe(204)
    expect(await allocationOf(1, 2)).toBeUndefined()
    expect(await allocationOf(1, 3)).toBe(60)
    // Phần 40% đã trả về chưa phân bổ nên có thể nâng người còn lại lên 100%
    expect((await update(1, 3, { allocation: 100 })).status).toBe(200)
  })

  it('delete_OnlyAffectsThatAsset', async () => {
    await axiosClient.delete('/owner/assets/1/beneficiaries/2')
    expect(await allocationOf(3, 2)).toBe(50)
  })

  it('delete_NotAssigned_Returns404', async () => {
    expect((await call(axiosClient.delete('/owner/assets/1/beneficiaries/4'))).status).toBe(404)
  })

  it('delete_Twice_SecondReturns404', async () => {
    await axiosClient.delete('/owner/assets/1/beneficiaries/2')
    expect((await call(axiosClient.delete('/owner/assets/1/beneficiaries/2'))).status).toBe(404)
  })

  it('delete_UnknownAsset_Returns404', async () => {
    expect((await call(axiosClient.delete('/owner/assets/999/beneficiaries/2'))).status).toBe(404)
  })
})
