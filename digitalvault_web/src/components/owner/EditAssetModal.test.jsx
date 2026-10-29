import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { getAsset } from '../../callapi/ownerApi'
import { DEMO_ACCOUNT, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import EditAssetModal from './EditAssetModal'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

async function renderModal(overrides = {}) {
  const props = {
    asset: await getAsset(3),
    impact: { documents: 2, beneficiaries: 2 },
    onClose: vi.fn(),
    onSaved: vi.fn(),
    onRevoked: vi.fn(),
    ...overrides,
  }
  render(<EditAssetModal {...props} />)
  return props
}

const dialog = () => screen.getByRole('dialog', { name: 'Chỉnh Sửa Tài Sản' })

describe('EditAssetModal form', () => {
  it('render_Asset_PrefillsFields', async () => {
    await renderModal()
    expect(within(dialog()).getByLabelText(/Tên tài sản/)).toHaveValue('Kho Lưu Trữ Kỷ Niệm Gia Đình & Thư Di Nguyện')
    expect(within(dialog()).getByLabelText(/Loại tài sản/)).toHaveValue('Document')
    expect(within(dialog()).getByLabelText(/Mô tả/)).toHaveValue(
      'Kho nén 4.2GB hình ảnh gia đình, video nhắn nhủ và tài liệu bản quyền di chúc số.',
    )
  })

  it('render_UnknownAssetType_KeepsItSelectable', async () => {
    const asset = { ...(await getAsset(3)), type: 'LoaiLa' }
    await renderModal({ asset })
    expect(within(dialog()).getByLabelText(/Loại tài sản/)).toHaveValue('LoaiLa')
  })

  it('save_ChangedName_CallsApiAndOnSavedWithUpdatedAsset', async () => {
    const props = await renderModal()
    const name = within(dialog()).getByLabelText(/Tên tài sản/)
    await userEvent.clear(name)
    await userEvent.type(name, 'Kho kỷ niệm mới')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1))
    expect(props.onSaved.mock.calls[0][0]).toMatchObject({ assetId: 3, name: 'Kho kỷ niệm mới' })
    expect((await getAsset(3)).name).toBe('Kho kỷ niệm mới')
  })

  it('save_BlankName_ShowsErrorAndDoesNotCallOnSaved', async () => {
    const props = await renderModal()
    await userEvent.clear(within(dialog()).getByLabelText(/Tên tài sản/))
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await within(dialog()).findByText('Vui lòng nhập tên tài sản.')).toBeInTheDocument()
    expect(props.onSaved).not.toHaveBeenCalled()
  })

  it('save_ServerError_ShowsAlertAndKeepsModalOpen', async () => {
    server.use(http.put('*/api/owner/assets/:assetId', () => HttpResponse.json({ status: 500, detail: 'Máy chủ lỗi.' }, { status: 500 })))
    const props = await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Máy chủ lỗi.')
    expect(props.onSaved).not.toHaveBeenCalled()
  })

  it('save_AssetNoLongerExists_ShowsNotFoundMessage', async () => {
    server.use(http.put('*/api/owner/assets/:assetId', () => HttpResponse.json({ status: 404, detail: 'Asset not found.' }, { status: 404 })))
    await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Không tìm thấy tài sản. Vui lòng tải lại trang.')
  })

  it('cancel_Clicked_CallsOnClose', async () => {
    const props = await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Hủy' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})

describe('EditAssetModal delete', () => {
  it('revoke_Clicked_ShowsConfirmationWithImpact', async () => {
    await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Thu hồi tài sản' }))
    const confirm = screen.getByRole('dialog', { name: 'Xác Nhận Thu Hồi Tài Sản' })
    expect(confirm).toHaveTextContent('Kho Lưu Trữ Kỷ Niệm Gia Đình & Thư Di Nguyện')
    expect(confirm).toHaveTextContent('2 giấy tờ')
    expect(confirm).toHaveTextContent('2 người thụ hưởng')
  })

  it('revoke_ConfirmationBack_ReturnsToForm', async () => {
    await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Thu hồi tài sản' }))
    await userEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(within(dialog()).getByLabelText(/Tên tài sản/)).toBeInTheDocument()
  })

  it('revoke_Confirmed_RevokesAssetAndCallsOnRevoked', async () => {
    const props = await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Thu hồi tài sản' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận thu hồi' }))
    await waitFor(() => expect(props.onRevoked).toHaveBeenCalledTimes(1))
    expect((await getAsset(3)).status).toBe('Revoked')
  })

  it('revoke_ServerError_ShowsAlertAndDoesNotCallOnDeleted', async () => {
    server.use(http.post('*/api/owner/assets/:assetId/revoke', () => HttpResponse.json({ status: 500, detail: 'Không xóa được.' }, { status: 500 })))
    const props = await renderModal()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Thu hồi tài sản' }))
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận thu hồi' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Không xóa được.')
    expect(props.onRevoked).not.toHaveBeenCalled()
  })
})
