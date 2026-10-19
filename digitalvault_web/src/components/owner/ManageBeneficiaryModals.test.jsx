import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { login } from '../../callapi/authApi'
import { getAssets, getBeneficiaries } from '../../callapi/ownerApi'
import { DEMO_ACCOUNT, resetMockDb } from '../../mocks/db'
import { handlers } from '../../mocks/handlers'
import { attachBeneficiaries, groupBeneficiariesByPerson } from '../../utils/catalog'
import EditAllocationModal from './EditAllocationModal'
import RemoveBeneficiaryModal from './RemoveBeneficiaryModal'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  await login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Trần Bảo Long (id 2): tài sản 1 hưởng 40% (Mai 60%), tài sản 3 hưởng 50% (Mai 50%), tài sản 5 hưởng 100%
async function loadLong() {
  const [assets, beneficiaries] = await Promise.all([getAssets(), getBeneficiaries()])
  const person = groupBeneficiariesByPerson(attachBeneficiaries(assets, beneficiaries), beneficiaries).find((p) => p.beneficiaryId === 2)
  return { person, beneficiaries }
}

const rowInput = (name) => screen.getByLabelText(name)
const allocationOf = async (assetId, beneficiaryId) =>
  (await getBeneficiaries(assetId)).find((row) => row.beneficiaryId === beneficiaryId)?.allocation

describe('EditAllocationModal', () => {
  async function renderEdit() {
    const { person, beneficiaries } = await loadLong()
    const props = { person, beneficiaries, onClose: vi.fn(), onChanged: vi.fn() }
    render(<EditAllocationModal {...props} />)
    return props
  }
  const dialog = () => screen.getByRole('dialog', { name: 'Sửa Phân Quyền Người Thụ Hưởng' })

  it('render_Person_ShowsRowPerAssetWithCurrentValueAndMaximum', async () => {
    await renderEdit()
    expect(dialog()).toHaveTextContent('Trần Bảo Long')
    expect(rowInput(/Ví Lạnh Trữ Crypto/)).toHaveValue(40)
    expect(rowInput(/Kho Lưu Trữ Kỷ Niệm/)).toHaveValue(50)
    expect(rowInput(/Chứng Khoán SSI/)).toHaveValue(100)
    expect(within(dialog()).getByText('Tối đa 40%')).toBeInTheDocument()
    expect(within(dialog()).getByText('Tối đa 50%')).toBeInTheDocument()
    expect(within(dialog()).getByText('Tối đa 100%')).toBeInTheDocument()
  })

  it('render_NothingChanged_DisablesSave', async () => {
    await renderEdit()
    expect(within(dialog()).getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()
  })

  it('save_ChangedRow_UpdatesOnlyThatAssetAndCallsOnChanged', async () => {
    const props = await renderEdit()
    const input = rowInput(/Kho Lưu Trữ Kỷ Niệm/)
    await userEvent.clear(input)
    await userEvent.type(input, '30')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(props.onChanged).toHaveBeenCalledTimes(1))
    expect(await allocationOf(3, 2)).toBe(30)
    expect(await allocationOf(1, 2)).toBe(40)
  })

  it('save_AboveMaximum_ShowsErrorWithoutCallingApi', async () => {
    const requests = []
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PUT') requests.push(request.url)
    })
    const props = await renderEdit()
    const input = rowInput(/Ví Lạnh Trữ Crypto/)
    await userEvent.clear(input)
    await userEvent.type(input, '55')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await within(dialog()).findByText('Tỷ lệ phải từ 0.01% đến 40%, tối đa 2 chữ số thập phân.')).toBeInTheDocument()
    expect(requests).toHaveLength(0)
    expect(props.onChanged).not.toHaveBeenCalled()
    server.events.removeAllListeners()
  })

  it('save_EmptyValue_ShowsError', async () => {
    await renderEdit()
    await userEvent.clear(rowInput(/Ví Lạnh Trữ Crypto/))
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await within(dialog()).findByText(/Tỷ lệ phải từ 0.01% đến 40%/)).toBeInTheDocument()
  })

  it('save_OneRowFails_ShowsWhichAssetAndStillReportsChangeOnClose', async () => {
    server.use(http.put('*/api/owner/assets/3/allocations/:assignmentId', () => HttpResponse.json({ status: 500, detail: 'x' }, { status: 500 })))
    const props = await renderEdit()
    for (const [name, value] of [[/Ví Lạnh Trữ Crypto/, '30'], [/Kho Lưu Trữ Kỷ Niệm/, '20']]) {
      await userEvent.clear(rowInput(name))
      await userEvent.type(rowInput(name), value)
    }
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Không cập nhật được: Kho Lưu Trữ Kỷ Niệm')
    expect(await allocationOf(1, 2)).toBe(30)
    expect(props.onChanged).not.toHaveBeenCalled()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Hủy' }))
    expect(props.onChanged).toHaveBeenCalledTimes(1)
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('cancel_NothingSaved_CallsOnClose', async () => {
    const props = await renderEdit()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Hủy' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(props.onChanged).not.toHaveBeenCalled()
  })
})

describe('RemoveBeneficiaryModal', () => {
  async function renderRemove() {
    const { person } = await loadLong()
    const props = { person, onClose: vi.fn(), onRemoved: vi.fn() }
    render(<RemoveBeneficiaryModal {...props} />)
    return props
  }
  const dialog = () => screen.getByRole('dialog', { name: 'Xóa Người Thụ Hưởng' })

  it('render_Person_ListsEveryAffectedAssetWithAllocation', async () => {
    await renderRemove()
    expect(dialog()).toHaveTextContent('Trần Bảo Long')
    expect(dialog()).toHaveTextContent('3 tài sản')
    const list = within(dialog()).getByRole('list', { name: 'Tài sản bị ảnh hưởng' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(list).toHaveTextContent('Ví Lạnh Trữ Crypto')
    expect(list).toHaveTextContent('40%')
    expect(dialog()).toHaveTextContent('chưa phân bổ')
  })

  it('confirm_Clicked_RemovesFromAllAssetsAndCallsOnRemoved', async () => {
    const props = await renderRemove()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Xác nhận xóa' }))
    await waitFor(() => expect(props.onRemoved).toHaveBeenCalledTimes(1))
    expect((await getBeneficiaries()).some((row) => row.beneficiaryId === 2)).toBe(false)
    expect((await getBeneficiaries()).some((row) => row.beneficiaryId === 3)).toBe(true)
  })

  it('confirm_AlreadyRemovedOnServer_IsTreatedAsSuccess', async () => {
    server.use(http.post('*/api/owner/assets/1/allocations/:assignmentId/revoke', () => HttpResponse.json({ status: 404, detail: 'x' }, { status: 404 })))
    const props = await renderRemove()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Xác nhận xóa' }))
    await waitFor(() => expect(props.onRemoved).toHaveBeenCalledTimes(1))
  })

  it('confirm_ServerError_ShowsAlertAndKeepsDialog', async () => {
    server.use(http.post('*/api/owner/assets/:assetId/allocations/:assignmentId/revoke', () => HttpResponse.json({ status: 500, detail: 'Không xóa được.' }, { status: 500 })))
    const props = await renderRemove()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Xác nhận xóa' }))
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Không xóa được.')
    expect(props.onRemoved).not.toHaveBeenCalled()
  })

  it('confirm_VaultProtectedByHandover409_ExplainsHandoverBlocksTheChange', async () => {
    server.use(http.post('*/api/owner/assets/:assetId/allocations/:assignmentId/revoke', () => HttpResponse.json({ status: 409, detail: 'Handover records protect this vault from mutation.' }, { status: 409 })))
    const props = await renderRemove()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Xác nhận xóa' }))
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Kho này đang có hồ sơ bàn giao')
    expect(props.onRemoved).not.toHaveBeenCalled()
  })

  it('cancel_Clicked_CallsOnCloseWithoutDeleting', async () => {
    const props = await renderRemove()
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Hủy' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect((await getBeneficiaries()).some((row) => row.beneficiaryId === 2)).toBe(true)
  })
})
