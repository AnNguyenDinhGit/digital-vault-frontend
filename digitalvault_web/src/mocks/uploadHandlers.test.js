// @vitest-environment node
// Chạy trong môi trường Node: jsdom làm File bị gửi thành chuỗi nên không test được multipart thật qua XHR của jsdom
import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { uploadDocument } from '../callapi/ownerApi'
import { DEMO_ACCOUNT, resetMockDb, ROLE_ACCOUNTS } from './db'
import { handlers } from './handlers'

// Node không có sessionStorage/localStorage, mock cần chúng để giữ phiên đăng nhập giả
function memoryStorage() {
  const data = new Map()
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear(),
  }
}
globalThis.sessionStorage = memoryStorage()
globalThis.localStorage = memoryStorage()
// Axios trong Node cần URL tuyệt đối
axiosClient.defaults.baseURL = 'http://localhost/api'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const pdf = (name = 'HopDong.pdf') => new File(['%PDF-1.4 demo'], name, { type: 'application/pdf' })
const signature = () => new File([new Uint8Array(256)], 'HopDong.sig')

// Gọi API upload và trả lỗi đã chuẩn hoá thay vì ném ra
async function attempt(assetId, input) {
  try {
    return { ok: true, data: await uploadDocument(assetId, input) }
  } catch (error) {
    return { ok: false, status: error.status, message: error.message }
  }
}

// Tài sản 2 đã có người thụ hưởng Mai (userId 3), tài sản 4 chưa có ai
const MAI = 3
const LONG = 2

describe('mock upload document', () => {
  it('upload_FileAndSignature_ReturnsDocumentDtoAndAppearsOnAsset', async () => {
    const result = await attempt(2, { file: pdf('Moi.pdf'), signature: signature() })
    expect(result.ok).toBe(true)
    expect(result.data).toMatchObject({ fileName: 'Moi.pdf', fileType: 'application/pdf', isEncrypted: true })
    const asset = (await axiosClient.get('/owner/assets/2')).data
    expect(asset.documents.map((d) => d.fileName)).toContain('Moi.pdf')
  })

  it('upload_BeneficiaryIsOptional_AssetWithoutBeneficiaryAcceptsUpload', async () => {
    const result = await attempt(4, { file: pdf(), signature: signature() })
    expect(result.ok).toBe(true)
    expect((await axiosClient.get('/owner/beneficiaries', { params: { assetId: 4 } })).data).toEqual([])
  })

  it('upload_WithAssignedBeneficiary_IsAccepted', async () => {
    expect((await attempt(2, { file: pdf(), signature: signature(), beneficiaryId: MAI })).ok).toBe(true)
  })

  it('upload_WithoutSignature_Returns400', async () => {
    const result = await attempt(2, { file: pdf() })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(400)
  })

  it('upload_SignatureOverSixteenKilobytes_Returns400', async () => {
    const big = new File([new Uint8Array(16385)], 'big.sig')
    expect((await attempt(2, { file: pdf(), signature: big })).status).toBe(400)
  })

  it('upload_UnsupportedFileType_Returns400', async () => {
    const exe = new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' })
    expect((await attempt(2, { file: exe, signature: signature() })).status).toBe(400)
  })

  it('upload_LegacyFieldsOwnerAliveOrDeathCertificate_Returns400', async () => {
    const form = new FormData()
    form.append('File', pdf())
    form.append('Signature', signature())
    form.append('OwnerAlive', 'false')
    const rejected = await axiosClient.post('/owner/assets/2/documents', form).catch((error) => error)
    expect(rejected.status).toBe(400)
    const withCertificate = new FormData()
    withCertificate.append('File', pdf())
    withCertificate.append('Signature', signature())
    withCertificate.append('DeathCertificate', pdf('ChungTu.pdf'))
    expect((await axiosClient.post('/owner/assets/2/documents', withCertificate).catch((error) => error)).status).toBe(400)
  })

  it('upload_UnknownAsset_Returns404', async () => {
    expect((await attempt(999, { file: pdf(), signature: signature() })).status).toBe(404)
  })

  it('upload_BeneficiaryNotInAssetAllocations_Returns409', async () => {
    // Tài sản 2 chỉ phân bổ cho Mai nên không chọn được Long
    expect((await attempt(2, { file: pdf(), signature: signature(), beneficiaryId: LONG })).status).toBe(409)
  })

  it('upload_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await attempt(2, { file: pdf(), signature: signature() })).status).toBe(403)
  })
})
