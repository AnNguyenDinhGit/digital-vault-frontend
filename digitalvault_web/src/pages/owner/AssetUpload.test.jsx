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
function fakeSuccessfulUpload(fileName) {
  uploadDocument.mockImplementation(async (assetId, input) => {
    const document = { documentId: 99, fileName: input.file.name ?? fileName, fileType: input.file.type, isEncrypted: true, signatureValid: null }
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
  it('button_AddDocument_OpensDialogWithAliveBranchByDefault', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    expect(within(dialog).getByRole('radio', { name: 'Còn sống' })).toBeChecked()
    expect(within(dialog).getByLabelText(/^Chữ ký số rời/)).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/^Giấy chứng tử/)).not.toBeInTheDocument()
  })

  it('radio_DeadBranch_ShowsCertificateFieldInsteadOfSignature', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Đã mất' }))
    expect(within(dialog).getByLabelText(/^Giấy chứng tử/)).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/^Chữ ký số rời/)).not.toBeInTheDocument()
    expect(within(dialog).getByText(/chỉ là khai báo/i)).toBeInTheDocument()
  })

  it('beneficiarySelect_OnlyListsBeneficiariesOfThatAsset', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    const options = within(within(dialog).getByLabelText(/^Người thụ hưởng/)).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Chọn người thụ hưởng', 'Nguyễn Thị Mai (100%)'])
  })

  it('modal_AssetWithoutBeneficiary_ShowsWarningAndDisablesSubmit', async () => {
    const user = setupUser()
    await renderDetail(4)
    const dialog = await openModal(user)
    expect(within(dialog).getByText(/chỉ định người thụ hưởng/i)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Tải lên' })).toBeDisabled()
  })

  it('submit_EmptyForm_ShowsRequiredErrorsAndDoesNotUpload', async () => {
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))
    expect(within(dialog).getByText('Vui lòng chọn file giấy tờ.')).toBeInTheDocument()
    expect(within(dialog).getByText('Vui lòng chọn file chữ ký rời.')).toBeInTheDocument()
    expect(within(dialog).getByText('Vui lòng chọn người thụ hưởng.')).toBeInTheDocument()
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

  it('submit_AliveWithAllFields_ClosesDialogAndListsNewDocument', async () => {
    fakeSuccessfulUpload()
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Người thụ hưởng/), '3')
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), pdf('HopDongMoi.pdf'))
    await user.upload(within(dialog).getByLabelText(/^Chữ ký số rời/), signatureFile())
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [assetId, input] = uploadDocument.mock.calls[0]
    expect(assetId).toBe(2)
    expect(input).toMatchObject({ beneficiaryId: 3, ownerAlive: true })
    expect(input.file.name).toBe('HopDongMoi.pdf')
    expect(input.signature.name).toBe('HopDong.sig')
    const list = await screen.findByRole('list', { name: 'Giấy tờ đính kèm' })
    await waitFor(() => expect(within(list).getByText('HopDongMoi.pdf')).toBeInTheDocument())
    expect(screen.getByText('2 giấy tờ')).toBeInTheDocument()
  })

  it('submit_DeadWithCertificate_ClosesDialogAndListsNewDocument', async () => {
    fakeSuccessfulUpload()
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.click(within(dialog).getByRole('radio', { name: 'Đã mất' }))
    await user.selectOptions(within(dialog).getByLabelText(/^Người thụ hưởng/), '3')
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), pdf('DiChuc.pdf'))
    await user.upload(within(dialog).getByLabelText(/^Giấy chứng tử/), pdf('ChungTu.pdf'))
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(uploadDocument.mock.calls[0][1]).toMatchObject({ ownerAlive: false })
    expect(uploadDocument.mock.calls[0][1].deathCertificate.name).toBe('ChungTu.pdf')
    const list = await screen.findByRole('list', { name: 'Giấy tờ đính kèm' })
    await waitFor(() => expect(within(list).getByText('DiChuc.pdf')).toBeInTheDocument())
  })

  it('submit_ServerRejectsSignature_ShowsErrorInsideDialog', async () => {
    uploadDocument.mockRejectedValue(new ApiError(400, 'Signature is invalid.'))
    const user = setupUser()
    await renderDetail(2)
    const dialog = await openModal(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Người thụ hưởng/), '3')
    await user.upload(within(dialog).getByLabelText(/^Giấy tờ/), pdf())
    await user.upload(within(dialog).getByLabelText(/^Chữ ký số rời/), signatureFile())
    await user.click(within(dialog).getByRole('button', { name: 'Tải lên' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('chữ ký')
  })

  it('cancel_Button_ClosesDialog', async () => {
    const user = setupUser()
    await renderDetail(2)
    await openModal(user)
    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
