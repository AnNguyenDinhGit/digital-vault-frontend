import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { resetMockDb, DEMO_ACCOUNT } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetMockDb())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Gọi API và trả về lỗi đã chuẩn hoá thay vì ném ra
async function call(promise) {
  try {
    const response = await promise
    return { status: response.status, data: response.data }
  } catch (error) {
    return { status: error.status, message: error.message }
  }
}

const loginAsDemo = () => axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })

describe('mock auth', () => {
  it('login_DemoAccount_ReturnsUserIdAndOwnerRole', async () => {
    const result = await call(loginAsDemo())
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ userId: DEMO_ACCOUNT.userId, roles: ['Owner'] })
  })

  it('login_WrongPassword_Returns401', async () => {
    const result = await call(axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: 'sai-mat-khau' }))
    expect(result.status).toBe(401)
  })

  it('login_WithoutCsrfHeader_Returns400', async () => {
    // Gọi thẳng fetch để không đi qua interceptor gắn X-Vault-Request
    const response = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password }),
    })
    expect(response.status).toBe(400)
  })

  it('register_NewEmail_Returns201WithOwnerRole', async () => {
    const result = await call(
      axiosClient.post('/auth/register', {
        fullName: 'Le Van B',
        email: 'b@example.com',
        phone: null,
        password: 'Registration123!',
        confirmPassword: 'Registration123!',
      }),
    )
    expect(result.status).toBe(201)
    expect(result.data).toMatchObject({ fullName: 'Le Van B', email: 'b@example.com', roles: ['Owner'] })
  })

  it('register_DuplicateEmailDifferentCase_Returns409', async () => {
    const result = await call(
      axiosClient.post('/auth/register', {
        fullName: 'Trung',
        email: DEMO_ACCOUNT.email.toUpperCase(),
        phone: null,
        password: 'Registration123!',
        confirmPassword: 'Registration123!',
      }),
    )
    expect(result.status).toBe(409)
  })

  it('logout_AfterLogin_Returns204AndRemovesSession', async () => {
    await loginAsDemo()
    expect((await call(axiosClient.post('/auth/logout'))).status).toBe(204)
    expect((await call(axiosClient.get('/owner/vaults'))).status).toBe(401)
  })
})

describe('mock owner vaults', () => {
  it('getVaults_NotLoggedIn_Returns401WithDetail', async () => {
    const result = await call(axiosClient.get('/owner/vaults'))
    expect(result.status).toBe(401)
  })

  it('getVaults_LoggedIn_ReturnsVaultDtoShape', async () => {
    await loginAsDemo()
    const result = await call(axiosClient.get('/owner/vaults'))
    expect(result.status).toBe(200)
    expect(result.data.length).toBeGreaterThan(0)
    expect(Object.keys(result.data[0]).sort()).toEqual(['description', 'name', 'status', 'vaultId'])
  })

  it('createVault_ValidInput_Returns201AndAppearsInList', async () => {
    await loginAsDemo()
    const created = await call(axiosClient.post('/owner/vaults', { name: 'Kho moi', description: 'Mo ta' }))
    expect(created.status).toBe(201)
    expect(created.data).toMatchObject({ name: 'Kho moi', status: 'Active' })
    const list = await call(axiosClient.get('/owner/vaults'))
    expect(list.data.map((v) => v.vaultId)).toContain(created.data.vaultId)
  })

  it('createVault_EmptyName_Returns400', async () => {
    await loginAsDemo()
    expect((await call(axiosClient.post('/owner/vaults', { name: '  ' }))).status).toBe(400)
  })

  it('getVault_UnknownId_Returns404', async () => {
    await loginAsDemo()
    expect((await call(axiosClient.get('/owner/vaults/99999'))).status).toBe(404)
  })
})

describe('mock owner assets', () => {
  it('getAssets_LoggedIn_ReturnsAssetDtoShapeWithDocuments', async () => {
    await loginAsDemo()
    const result = await call(axiosClient.get('/owner/assets'))
    expect(result.status).toBe(200)
    expect(result.data.length).toBeGreaterThan(4)
    expect(Object.keys(result.data[0]).sort()).toEqual(['assetId', 'description', 'documents', 'name', 'status', 'type'])
  })

  it('createAsset_ValidInput_Returns201WithEmptyDocuments', async () => {
    await loginAsDemo()
    const [vault] = (await axiosClient.get('/owner/vaults')).data
    const result = await call(
      axiosClient.post('/owner/assets', { vaultId: vault.vaultId, name: 'Tai san moi', type: 'BankAccount' }),
    )
    expect(result.status).toBe(201)
    expect(result.data).toMatchObject({ name: 'Tai san moi', type: 'BankAccount', status: 'Active', documents: [] })
  })

  it('createAsset_UnknownVault_Returns404', async () => {
    await loginAsDemo()
    const result = await call(axiosClient.post('/owner/assets', { vaultId: 99999, name: 'A', type: 'Other' }))
    expect(result.status).toBe(404)
  })

  it('createAsset_NonAsciiType_Returns400', async () => {
    await loginAsDemo()
    const [vault] = (await axiosClient.get('/owner/vaults')).data
    const result = await call(axiosClient.post('/owner/assets', { vaultId: vault.vaultId, name: 'A', type: 'Ngân hàng' }))
    expect(result.status).toBe(400)
  })

  it('getAsset_UnknownId_Returns404', async () => {
    await loginAsDemo()
    expect((await call(axiosClient.get('/owner/assets/99999'))).status).toBe(404)
  })
})

describe('mock owner beneficiaries', () => {
  it('getBeneficiaries_ByAssetId_ReturnsOnlyThatAsset', async () => {
    await loginAsDemo()
    const all = (await axiosClient.get('/owner/beneficiaries')).data
    const assetId = all[0].assetId
    const filtered = await call(axiosClient.get('/owner/beneficiaries', { params: { assetId } }))
    expect(filtered.status).toBe(200)
    expect(filtered.data.every((b) => b.assetId === assetId)).toBe(true)
    expect(Object.keys(filtered.data[0]).sort()).toEqual(['allocation', 'assetId', 'beneficiaryId', 'fullName', 'status'])
  })

  it('assignBeneficiary_UnregisteredEmail_Returns404', async () => {
    await loginAsDemo()
    const assetId = (await axiosClient.get('/owner/assets')).data[0].assetId
    const result = await call(
      axiosClient.post(`/owner/assets/${assetId}/beneficiaries`, { email: 'khong-ton-tai@example.com', allocation: 10 }),
    )
    expect(result.status).toBe(404)
  })

  it('assignBeneficiary_OverHundredPercent_Returns409', async () => {
    await loginAsDemo()
    const [vault] = (await axiosClient.get('/owner/vaults')).data
    const asset = (await axiosClient.post('/owner/assets', { vaultId: vault.vaultId, name: 'A', type: 'Other' })).data
    const first = await call(
      axiosClient.post(`/owner/assets/${asset.assetId}/beneficiaries`, { email: 'long.tran@example.com', allocation: 70 }),
    )
    expect(first.status).toBe(201)
    const second = await call(
      axiosClient.post(`/owner/assets/${asset.assetId}/beneficiaries`, { email: 'mai.nguyen@example.com', allocation: 40 }),
    )
    expect(second.status).toBe(409)
  })
})
