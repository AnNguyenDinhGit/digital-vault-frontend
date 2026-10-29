import { clearPortalPreference, getPortalPreference, PORTAL_STORAGE_KEY, setPortalPreference } from './portalPreference'

beforeEach(() => sessionStorage.removeItem(PORTAL_STORAGE_KEY))

describe('portalPreference', () => {
  it('getPortalPreference_NothingStored_ReturnsNull', () => {
    expect(getPortalPreference()).toBeNull()
  })

  it('setPortalPreference_Role_CanBeReadBack', () => {
    setPortalPreference('Beneficiary')
    expect(getPortalPreference()).toBe('Beneficiary')
  })

  it('clearPortalPreference_AfterSet_RemovesIt', () => {
    setPortalPreference('Owner')
    clearPortalPreference()
    expect(getPortalPreference()).toBeNull()
  })

  it('getPortalPreference_StorageThrows_ReturnsNullInsteadOfCrashing', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(getPortalPreference()).toBeNull()
    spy.mockRestore()
  })
})
