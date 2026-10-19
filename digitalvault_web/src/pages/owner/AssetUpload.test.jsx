import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { ApiError } from '../../callapi/axiosClient'
import { uploadDocument } from '../../callapi/ownerApi'
import { DEMO_ACCOUNT, getDb, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { renderWithProviders } from '../../test/renderWithProviders'
import AssetDetailPage from './AssetDetailPage'

// Upload multipart không test được qua XHR của jsdom (File bị gửi thành chuỗi), nên thay riêng hàm uploadDocument;
// việc mock endpoint upload đã được test ở mocks/uploadHandlers.test.js trong môi trường Node
vi.mock('../../callapi/ownerApi', async (importOriginal) => ({ ...(await importOriginal()), uploadDocument: vi.fn() }))

const server = setupServer(...handlers)

// Giả lập BE đã nhận file: thêm giấy tờ vào dữ liệu mock để lần tải lại trang thấy file mới
function fakeSuccessfulUpload() {
  uploadDocument.mockImplementation(async (assetId, input) => {
    const document = { documentId: 99, fileName: input.file.name, fileType: input.file.type, isEncrypted: true, signatureValid: null }
    getDb().assets.find((a) => a.assetId === assetId).documents.push(document)
    return document
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  uploadDocument.mockReset()
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// applyAccept: false để thử được cả file sai định dạng (thuộc tính accept chỉ là gợi ý cho trình duyệt)
const setupUser = () => userEvent.setup({ applyAccept: false })

const renderDetail = async (assetId) => {
  renderWithProviders(<AssetDetailPage />, {
    route: `/owner/assets/${assetId}`,
    path: '/owner/assets/:assetId',
    extraRoutes: [{ path: '/owner/assets', element: <p>catalog-page</p> }],
  })
  await screen.findByRole('heading', { level: 1 })
}

const openModal = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Thêm giấy tờ' }))
  return screen.getByRole('dialog', { name: 'Thêm Giấy Tờ Chứng Minh' })
}

const pdf = (name = 'HopDong.pdf') => new File(['%PDF-1.4 demo'], name, { type: 'application/pdf' })
const signatureFile = () => new File([new Uint8Array(256)], 'HopDong.sig')

// Tài sản 2 (Vietcombank) có người thụ hưởng Mai; tài sản 4 (YouTube) chưa có ai
describe('Upload document modal', () => {
  it('button_AddDocument_OpensDialogWithFileAndSignatureOnly', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    expect(within(dialog).getByLabelText(/^Giấy tờ/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^Chữ ký số rời/)).toBeInTheDocument()
  })

  it('modal_NoLongerOffersOwnerStatusOrDeathCertificate', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/^Giấy chứng tử/)).not.toBeInTheDocument()
    expect(within(dialog).getByText(/Người thi hành nộp/)).toBeInTheDocument()
  })

  it('beneficiarySelect_IsOptionalAndOnlyListsBeneficiariesOfThatAsset', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    const select = within(dialog).getByLabelText(/^Người thụ hưởng/)
    expect(select).toHaveValue('')
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Không gắn người thụ hưởng cụ thể',
      'Nguyễn Thị Mai (100%)',
    ])
  })

  it('modal_AssetWithoutBeneficiary_StillAllowsUpload', async () => {
    const user = setupUser()
    await renderDetail(4)
    const dialog = await openModal(user)
    expect(within(dialog).getByRole('button', { name: 'Tải lên' })).toBeEnabled()
  })

  it('submit_EmptyForm_ShowsFileAndSignatureErrorsOnly', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))
    expect(within(dialog).getByText('Vui lòng chọn file giấy tờ.')).toBeInTheDocument()
    expect(within(dialog).getByText('Vui lòng chọn file chữ ký rời.')).toBeInTheDocument()
    expect(within(dialog).queryByText('Vui lòng chọn người thụ hưởng.')).not.toBeInTheDocument()
    expect(uploadDocument).not.toHaveBeenCalled()
  })

  it('submit_UnsupportedFileType_ShowsTypeError', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' }))
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))
    expect(within(dialog).getByText('Chỉ hỗ trợ PDF, PNG, JPEG hoặc văn bản (.txt).')).toBeInTheDocument()
  })

  it('submit_FileOverTenMegabytes_ShowsSizeError', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    const big = new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' })
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), big)
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))
    expect(within(dialog).getByText('File phải từ 1 byte đến 10 MB.')).toBeInTheDocument()
  })

  it('selectedFile_AfterChoosing_ShowsNameAndSize', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), pdf('Moi.pdf'))
    expect(within(dialog).getByText(/Moi\.pdf/)).toBeInTheDocument()
  })

  it('submit_FileAndSignature_ClosesDialogAndListsNewDocument', async () => {
    fakeSuccessfulUpload()
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), pdf('HopDongMoi.pdf'))
    await user.upload(within(dialog).getByLabelText(/^Chữ ký số rời/), signatureFile())
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [assetId, input] = uploadDocument.mock.calls[0]
    expect(assetId).toBe(2)
    expect(input.beneficiaryId).toBeUndefined()
    expect(input.file.name).toBe('HopDongMoi.pdf')
    expect(input.signature.name).toBe('HopDong.sig')
    const list = await screen.findByRole('list', { name: 'Giấy tờ đính kèm' })
    await waitFor(() => expect(within(list).getByText('HopDongMoi.pdf')).toBeInTheDocument())
    expect(screen.getByText('2 giấy tờ')).toBeInTheDocument()
  })

  it('submit_WithChosenBeneficiary_SendsBeneficiaryId', async () => {
    fakeSuccessfulUpload()
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Người thụ hưởng/), '3')
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), pdf())
    await user.upload(within(dialog).getByLabelText(/^Chữ ký số rời/), signatureFile())
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))
    await waitFor(() => expect(uploadDocument).toHaveBeenCalled())
    expect(uploadDocument.mock.calls[0][1]).toMatchObject({ beneficiaryId: 3 })
  })

  it('submit_ServerRejectsSignature_ShowsVietnameseMessageAndServerDetail', async () => {
    uploadDocument.mockRejectedValue(new ApiError(400, 'Invalid signature, untrusted/expired certificate, or signer certificate not configured.'))
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), pdf())
    await user.upload(within(dialog).getByLabelText(/^Chữ ký số rời/), signatureFile())
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('chữ ký')
    expect(alert).toHaveTextContent('signer certificate not configured')
  })

  it('submit_VaultProtectedByHandover409_ExplainsInsteadOfBlamingBeneficiary', async () => {
    uploadDocument.mockRejectedValue(new ApiError(409, 'Handover records protect this vault from mutation.'))
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), pdf())
    await user.upload(within(dialog).getByLabelText(/^Chữ ký số rời/), signatureFile())
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('Kho này đang có hồ sơ bàn giao')
    expect(alert).not.toHaveTextContent('Người thụ hưởng không nằm')
  })

  it('cancel_Button_ClosesDialog', async () => {
    const user = setupUser()
    await renderDetail(2)
    await openModal(user)
    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
