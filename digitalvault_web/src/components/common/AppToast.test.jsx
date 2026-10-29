import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppToast from './AppToast'

describe('AppToast', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('render_NotShown_RendersNothing', () => {
    render(<AppToast show={false} onClose={vi.fn()} title="Xong" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('render_Shown_ShowsTitleAndDetailAsPoliteStatus', () => {
    render(<AppToast show onClose={vi.fn()} title="Cập nhật thành công!" detail="Chu kỳ mới: 30 ngày" />)
    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('Cập nhật thành công!')
    expect(toast).toHaveTextContent('Chu kỳ mới: 30 ngày')
  })

  it('autoHide_AfterDelay_CallsOnClose', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<AppToast show onClose={onClose} title="Xong" autoHideMs={5000} />)
    act(() => vi.advanceTimersByTime(4999))
    expect(onClose).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(2))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('autoHide_HoveringToast_PausesTheTimer', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<AppToast show onClose={onClose} title="Xong" autoHideMs={5000} />)
    act(() => {
      screen.getByRole('status').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    act(() => vi.advanceTimersByTime(20000))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closeButton_Clicked_CallsOnClose', async () => {
    const onClose = vi.fn()
    render(<AppToast show onClose={onClose} title="Xong" />)
    await userEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
