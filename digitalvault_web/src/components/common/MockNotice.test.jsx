import { render, screen } from '@testing-library/react'
import MockNotice from './MockNotice'

describe('MockNotice', () => {
  it('render_ModeOff_RendersNothing', () => {
    const { container } = render(<MockNotice mode="off" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('render_HybridMode_ShowsSimulationNote', () => {
    render(<MockNotice mode="hybrid" />)
    expect(screen.getByRole('note')).toHaveTextContent('Dữ liệu mô phỏng')
    expect(screen.getByRole('note')).toHaveTextContent('chưa có API trên máy chủ')
  })

  it('render_FullMode_ShowsSimulationNote', () => {
    render(<MockNotice mode="full" />)
    expect(screen.getByRole('note')).toBeInTheDocument()
  })

  it('render_CustomMessage_OverridesDefaultText', () => {
    render(<MockNotice mode="hybrid" message="Mật khẩu thật chưa đổi." />)
    expect(screen.getByRole('note')).toHaveTextContent('Mật khẩu thật chưa đổi.')
  })
})
