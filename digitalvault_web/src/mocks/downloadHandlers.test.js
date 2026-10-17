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
    return { status: response.status, data: response.data, headers: response.headers }
  } catch (error) {
    return { status: error.status, message: error.message }
  }
}

// Tài sản 2 có giấy tờ 11 (SoTietKiem_Signed.pdf), tài sản 3 có giấy tờ 12 và 13
const download = (assetId, documentId) => call(axiosClient.get(`/owner/assets/${assetId}/documents/${documentId}/content`, { responseType: 'text' }))

describe('mock download document content', () => {
  it('get_ExistingDocument_ReturnsPlaceholderContentNamingTheFile', async () => {
    const result = await download(2, 11)
    expect(result.status).toBe(200)
    expect(result.data).toContain('SoTietKiem_Signed.pdf')
    expect(result.data).toContain('mô phỏng')
  })

  it('get_ExistingDocument_SendsSignatureValidHeaderLikeBackend', async () => {
    expect((await download(2, 11)).headers['x-signature-valid']).toBe('true')
  })

  it('get_DocumentOfAnotherAsset_Returns404', async () => {
    expect((await download(2, 12)).status).toBe(404)
  })

  it('get_UnknownAsset_Returns404', async () => {
    expect((await download(999, 11)).status).toBe(404)
  })

  it('get_UnknownDocument_Returns404', async () => {
    expect((await download(2, 999)).status).toBe(404)
  })

  it('get_AssetOfSomeoneElse_Returns404', async () => {
    await axiosClient.post('/auth/login', { email: 'long.tran@example.com', password: 'Owner@123456' })
    expect((await download(2, 11)).status).toBe(404)
  })

  it('get_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await download(2, 11)).status).toBe(403)
  })
})
