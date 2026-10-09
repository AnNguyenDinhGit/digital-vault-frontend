import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('render_Default_ShowsBrandName', () => {
    render(<App />)
    expect(screen.getAllByText('AeternaVault').length).toBeGreaterThan(0)
  })
})
