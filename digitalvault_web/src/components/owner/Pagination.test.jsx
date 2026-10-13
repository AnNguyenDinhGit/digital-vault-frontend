import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from './Pagination'

const pageData = { page: 1, totalPages: 3, total: 25, from: 1, to: 10 }

describe('Pagination', () => {
  it('render_Defaults_UsesAssetWordingAndAssetPageSizes', () => {
    render(<Pagination pageData={pageData} pageSize={4} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />)
    expect(screen.getByText('Hiển thị 1 - 10 trong tổng số 25 tài sản số')).toBeInTheDocument()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['4 tài sản / trang', '8 tài sản / trang', '12 tài sản / trang'])
  })

  it('render_CustomUnitAndSizes_UsesGivenWording', () => {
    render(
      <Pagination
        pageData={pageData}
        pageSize={10}
        unit="bản ghi"
        perPageUnit="bản ghi"
        sizeOptions={[10, 20, 50]}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Hiển thị 1 - 10 trong tổng số 25 bản ghi')).toBeInTheDocument()
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['10 bản ghi / trang', '20 bản ghi / trang', '50 bản ghi / trang'])
  })

  it('pageSizeChange_Selected_CallsHandlerWithNumber', async () => {
    const onPageSizeChange = vi.fn()
    render(<Pagination pageData={pageData} pageSize={10} sizeOptions={[10, 20, 50]} onPageChange={vi.fn()} onPageSizeChange={onPageSizeChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Số lượng'), '20')
    expect(onPageSizeChange).toHaveBeenCalledWith(20)
  })

  it('buttons_FirstPage_DisablesPreviousAndNextGoesForward', async () => {
    const onPageChange = vi.fn()
    render(<Pagination pageData={pageData} pageSize={10} onPageChange={onPageChange} onPageSizeChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Trước' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Tiếp' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
