import { getDefaultRouteForRoles, getPortals, portalRoleOfPath } from './roleRoutes'

describe('getDefaultRouteForRoles', () => {
  it('getDefaultRouteForRoles_OwnerAndBeneficiary_PrefersOwner', () => {
    expect(getDefaultRouteForRoles(['Beneficiary', 'Owner'])).toBe('/owner/assets')
  })

  it('getDefaultRouteForRoles_PreferredRoleUserHas_UsesPreferred', () => {
    expect(getDefaultRouteForRoles(['Owner', 'Beneficiary'], 'Beneficiary')).toBe('/beneficiary')
  })

  it('getDefaultRouteForRoles_PreferredRoleUserLacks_FallsBackToPriority', () => {
    expect(getDefaultRouteForRoles(['Owner'], 'Admin')).toBe('/owner/assets')
  })

  it('getDefaultRouteForRoles_NoRoles_ReturnsNull', () => {
    expect(getDefaultRouteForRoles([])).toBeNull()
    expect(getDefaultRouteForRoles(undefined)).toBeNull()
  })
})

describe('getPortals', () => {
  it('getPortals_MultipleRoles_ReturnsPriorityOrderWithLabelAndRoute', () => {
    expect(getPortals(['Beneficiary', 'Owner'])).toEqual([
      { role: 'Owner', label: 'Chủ sở hữu kho', to: '/owner/assets' },
      { role: 'Beneficiary', label: 'Người thụ hưởng', to: '/beneficiary' },
    ])
  })

  it('getPortals_UnknownRole_IsIgnored', () => {
    expect(getPortals(['Owner', 'Khac']).map((portal) => portal.role)).toEqual(['Owner'])
  })

  it('getPortals_NoRoles_ReturnsEmptyList', () => {
    expect(getPortals(undefined)).toEqual([])
  })
})

describe('portalRoleOfPath', () => {
  it.each([
    ['/admin/users', 'Admin'],
    ['/verifier/pending', 'LegalVerifier'],
    ['/executor/orders', 'Executor'],
    ['/owner/assets/3', 'Owner'],
    ['/beneficiary', 'Beneficiary'],
  ])('portalRoleOfPath_%s_Returns%s', (path, role) => {
    expect(portalRoleOfPath(path)).toBe(role)
  })

  it('portalRoleOfPath_OtherPath_ReturnsNull', () => {
    expect(portalRoleOfPath('/')).toBeNull()
    expect(portalRoleOfPath('/ownership')).toBeNull()
  })
})
