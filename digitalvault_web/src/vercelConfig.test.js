import config from '../vercel.json'

const { rewrites } = config

describe('vercel.json', () => {
  it('rewrites_ApiPaths_ForwardToBackendApi', () => {
    const api = rewrites.find((rule) => rule.source.startsWith('/api/'))
    expect(api).toEqual({ source: '/api/:path*', destination: 'https://vault-owner-be.huydevops.id.vn/api/:path*' })
  })

  it('rewrites_AnyOtherPath_FallsBackToIndexHtmlForClientRouting', () => {
    const fallback = rewrites.at(-1)
    expect(fallback.destination).toBe('/index.html')
    // Mọi đường dẫn của React Router (kể cả /payment/vnpay-return và /auth/google/callback) đều khớp quy tắc này
    expect(new RegExp(`^${fallback.source}$`).test('/payment/vnpay-return')).toBe(true)
    expect(new RegExp(`^${fallback.source}$`).test('/auth/google/callback')).toBe(true)
  })

  it('rewrites_ApiRuleComesBeforeFallback_SoApiCallsAreNotSwallowedByIndexHtml', () => {
    const apiIndex = rewrites.findIndex((rule) => rule.source.startsWith('/api/'))
    expect(apiIndex).toBeGreaterThanOrEqual(0)
    expect(apiIndex).toBeLessThan(rewrites.length - 1)
  })
})
