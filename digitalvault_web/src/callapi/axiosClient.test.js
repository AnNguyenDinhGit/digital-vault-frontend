import axiosClient, { ApiError, setUnauthorizedHandler } from './axiosClient'

// Adapter giả: trả về response hoặc lỗi theo status mong muốn
const okAdapter = (data = {}) => vi.fn((config) => Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config }))
const errorAdapter = (status, data) =>
  vi.fn((config) => {
    const error = new Error(`Request failed with status code ${status}`)
    error.config = config
    error.response = { data, status, headers: {}, config }
    return Promise.reject(error)
  })

describe('axiosClient', () => {
  afterEach(() => {
    setUnauthorizedHandler(null)
  })

  it('request_PostMethod_AddsVaultHeader', async () => {
    const adapter = okAdapter()
    await axiosClient.post('/auth/login', {}, { adapter })
    expect(adapter.mock.calls[0][0].headers['X-Vault-Request']).toBe('1')
  })

  it('request_GetMethod_DoesNotAddVaultHeader', async () => {
    const adapter = okAdapter()
    await axiosClient.get('/owner/vaults', { adapter })
    expect(adapter.mock.calls[0][0].headers['X-Vault-Request']).toBeUndefined()
  })

  it('request_Always_SendsCredentials', async () => {
    const adapter = okAdapter()
    await axiosClient.get('/owner/vaults', { adapter })
    expect(adapter.mock.calls[0][0].withCredentials).toBe(true)
  })

  it('request_Default_UsesApiBaseUrl', () => {
    expect(axiosClient.defaults.baseURL).toBe('/api')
  })

  it('response_Error_NormalizesDetail', async () => {
    const adapter = errorAdapter(409, { status: 409, detail: 'Email is already registered.' })
    const error = await axiosClient.post('/auth/register', {}, { adapter }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(409)
    expect(error.message).toBe('Email is already registered.')
  })

  it('response_NetworkError_ReturnsStatusZero', async () => {
    const adapter = vi.fn((config) => {
      const error = new Error('Network Error')
      error.config = config
      return Promise.reject(error)
    })
    const error = await axiosClient.get('/owner/vaults', { adapter }).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
  })

  it('response_401_CallsUnauthorizedHandler', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    const adapter = errorAdapter(401, { status: 401, detail: 'Authentication required.' })
    await axiosClient.get('/owner/vaults', { adapter }).catch(() => {})
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('response_401WithSkipFlag_DoesNotCallUnauthorizedHandler', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    const adapter = errorAdapter(401, { status: 401, detail: 'Invalid credentials or account unavailable.' })
    const error = await axiosClient.post('/auth/login', {}, { adapter, skipAuthRedirect: true }).catch((e) => e)
    expect(handler).not.toHaveBeenCalled()
    expect(error.status).toBe(401)
  })
})
