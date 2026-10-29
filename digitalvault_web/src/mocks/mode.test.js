import { getMockMode } from './mode'

describe('getMockMode', () => {
  it('getMockMode_UseMockTrue_ReturnsFull', () => {
    expect(getMockMode({ VITE_USE_MOCK: 'true' })).toBe('full')
  })

  it('getMockMode_MissingApisTrue_ReturnsHybrid', () => {
    expect(getMockMode({ VITE_MOCK_MISSING_APIS: 'true' })).toBe('hybrid')
  })

  it('getMockMode_BothTrue_PrefersFull', () => {
    expect(getMockMode({ VITE_USE_MOCK: 'true', VITE_MOCK_MISSING_APIS: 'true' })).toBe('full')
  })

  it('getMockMode_NothingSet_ReturnsOff', () => {
    expect(getMockMode({})).toBe('off')
    expect(getMockMode(undefined)).toBe('off')
  })

  it('getMockMode_FalseStrings_ReturnsOff', () => {
    expect(getMockMode({ VITE_USE_MOCK: 'false', VITE_MOCK_MISSING_APIS: 'false' })).toBe('off')
  })
})
