import { buildForwardRequest } from './forward'

describe('buildForwardRequest', () => {
  const original = (headers = {}) => new Request('http://localhost/api/owner/vaults/1/executor', { method: 'PUT', headers, body: '{}' })

  it('build_WithBody_KeepsMethodUrlAndSendsJson', async () => {
    const request = buildForwardRequest(original(), { executorId: 7 })
    expect(request.method).toBe('PUT')
    expect(request.url).toBe('http://localhost/api/owner/vaults/1/executor')
    expect(request.headers.get('Content-Type')).toBe('application/json')
    expect(await request.json()).toEqual({ executorId: 7 })
  })

  it('build_Request_CopiesBearerTokenAndAddsVaultHeader', () => {
    const request = buildForwardRequest(original({ Authorization: 'Bearer abc.def' }), { executorId: 7 })
    expect(request.headers.get('Authorization')).toBe('Bearer abc.def')
    expect(request.headers.get('X-Vault-Request')).toBe('1')
  })

  it('build_NoAuthorization_DoesNotInventOne', () => {
    expect(buildForwardRequest(original(), { executorId: 7 }).headers.has('Authorization')).toBe(false)
  })

  it('build_NoBody_SendsNoBodyAndNoContentType', () => {
    const request = buildForwardRequest(new Request('http://localhost/api/x', { method: 'POST' }), null)
    expect(request.headers.has('Content-Type')).toBe(false)
  })
})
