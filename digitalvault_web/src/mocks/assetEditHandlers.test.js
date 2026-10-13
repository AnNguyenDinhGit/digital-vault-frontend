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

const edit = (assetId, body) => call(axiosClient.put(`/owner/assets/${assetId}`, { name: 'Tên mới', type: 'BankAccount', description: 'Mô tả mới', ...body }))

describe('mock update asset', () => {
  it('put_ValidInput_ReturnsUpdatedAssetAndKeepsDocuments', async () => {
    const result = await edit(2, { name: '  Sổ tiết kiệm mới  ' })
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ assetId: 2, name: 'Sổ tiết kiệm mới', type: 'BankAccount', description: 'Mô tả mới', status: 'Active' })
    expect(result.data.documents).toHaveLength(1)
    expect((await axiosClient.get('/owner/assets/2')).data.name).toBe('Sổ tiết kiệm mới')
  })

  it('put_BlankDescription_StoresNull', async () => {
    expect((await edit(1, { description: '   ' })).data.description).toBeNull()
  })

  it('put_ChangeType_UpdatesType', async () => {
    expect((await edit(1, { type: 'Document' })).data.type).toBe('Document')
  })

  it.each([
    [{ name: '   ' }],
    [{ name: 'x'.repeat(101) }],
    [{ type: 'Ngân hàng' }],
    [{ type: '' }],
    [{ description: 'x'.repeat(4001) }],
    [{ vaultId: 1 }],
  ])('put_InvalidBody_Returns400', async (body) => {
    expect((await edit(1, body)).status).toBe(400)
  })

  it('put_UnknownAsset_Returns404', async () => {
    expect((await edit(999, {})).status).toBe(404)
  })

  it('put_AssetOfSomeoneElse_Returns404', async () => {
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await edit(1, {})).status).toBe(404)
  })

  it('put_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await edit(1, {})).status).toBe(403)
  })
})

describe('mock delete asset', () => {
  it('delete_ExistingAsset_Returns204AndRemovesItEverywhere', async () => {
    expect((await call(axiosClient.delete('/owner/assets/1'))).status).toBe(204)
    expect((await call(axiosClient.get('/owner/assets/1'))).status).toBe(404)
    const assets = (await axiosClient.get('/owner/assets')).data
    expect(assets.map((a) => a.assetId)).not.toContain(1)
    expect(assets).toHaveLength(5)
  })

  it('delete_AssetWithBeneficiaries_RemovesTheirAssignments', async () => {
    await axiosClient.delete('/owner/assets/1')
    const rows = (await axiosClient.get('/owner/beneficiaries')).data
    expect(rows.some((row) => row.assetId === 1)).toBe(false)
    expect(rows.some((row) => row.assetId === 2)).toBe(true)
  })

  it('delete_UnknownAsset_Returns404', async () => {
    expect((await call(axiosClient.delete('/owner/assets/999'))).status).toBe(404)
  })

  it('delete_AlreadyDeleted_Returns404', async () => {
    await axiosClient.delete('/owner/assets/1')
    expect((await call(axiosClient.delete('/owner/assets/1'))).status).toBe(404)
  })

  it('delete_AssetOfSomeoneElse_Returns404', async () => {
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await call(axiosClient.delete('/owner/assets/1'))).status).toBe(404)
  })
})
