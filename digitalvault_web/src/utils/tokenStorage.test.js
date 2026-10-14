import { TOKEN_STORAGE_KEY, clearTokens, getTokens, setTokens } from './tokenStorage'

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: '2026-10-21T02:58:03Z' }

describe('tokenStorage', () => {
  beforeEach(() => sessionStorage.clear())

  it('getTokens_NothingStored_ReturnsNull', () => {
    expect(getTokens()).toBeNull()
  })

  it('setTokens_Tokens_AreReadBack', () => {
    setTokens(tokens)
    expect(getTokens()).toEqual(tokens)
  })

  it('setTokens_Tokens_AreKeptInSessionStorageNotLocalStorage', () => {
    setTokens(tokens)
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('setTokens_PartialUpdate_KeepsExistingFields', () => {
    setTokens(tokens)
    setTokens({ accessToken: 'access-2' })
    expect(getTokens()).toEqual({ ...tokens, accessToken: 'access-2' })
  })

  it('clearTokens_AfterSet_RemovesThem', () => {
    setTokens(tokens)
    clearTokens()
    expect(getTokens()).toBeNull()
  })

  it('getTokens_BrokenJson_ReturnsNull', () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, '{khong-phai-json')
    expect(getTokens()).toBeNull()
  })

  it('getTokens_MissingAccessToken_ReturnsNull', () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ refreshToken: 'r' }))
    expect(getTokens()).toBeNull()
  })

  it('setTokens_StorageBlocked_DoesNotThrow', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => setTokens(tokens)).not.toThrow()
    spy.mockRestore()
  })
})
