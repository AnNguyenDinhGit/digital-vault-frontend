import { act, renderHook, waitFor } from '@testing-library/react'
import * as ownerApi from '../callapi/ownerApi'
import { useOwnerCatalog } from './useOwnerCatalog'

vi.mock('../callapi/ownerApi', () => ({
  getVaults: vi.fn(),
  getAssets: vi.fn(),
  getBeneficiaries: vi.fn(),
}))

const vaults = [
  { vaultId: 1, name: 'Kho 1', description: null, status: 'Active' },
  { vaultId: 2, name: 'Kho 2', description: null, status: 'Active' },
]
const assets = [{ assetId: 1, name: 'A', type: 'Other', description: null, status: 'Active', documents: [] }]
const beneficiaries = [{ assetId: 1, beneficiaryId: 5, fullName: 'Long', allocation: 100, status: 'Active' }]

function mockSuccess() {
  ownerApi.getVaults.mockResolvedValue(vaults)
  ownerApi.getAssets.mockResolvedValue(assets)
  ownerApi.getBeneficiaries.mockResolvedValue(beneficiaries)
}

describe('useOwnerCatalog', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('useOwnerCatalog_Mounted_StartsInLoadingState', () => {
    mockSuccess()
    const { result } = renderHook(() => useOwnerCatalog())
    expect(result.current.status).toBe('loading')
  })

  it('useOwnerCatalog_ApiSucceeds_ReturnsReadyWithData', async () => {
    mockSuccess()
    const { result } = renderHook(() => useOwnerCatalog())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.vaults).toEqual(vaults)
    expect(result.current.assets[0].beneficiaries).toEqual(beneficiaries)
  })

  it('useOwnerCatalog_Ready_SelectsFirstVaultByDefault', async () => {
    mockSuccess()
    const { result } = renderHook(() => useOwnerCatalog())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.selectedVault.vaultId).toBe(1)
  })

  it('useOwnerCatalog_SelectVault_ChangesSelectedVault', async () => {
    mockSuccess()
    const { result } = renderHook(() => useOwnerCatalog())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.selectVault(2))
    expect(result.current.selectedVault.vaultId).toBe(2)
  })

  it('useOwnerCatalog_NoVaults_SelectedVaultIsNull', async () => {
    ownerApi.getVaults.mockResolvedValue([])
    ownerApi.getAssets.mockResolvedValue([])
    ownerApi.getBeneficiaries.mockResolvedValue([])
    const { result } = renderHook(() => useOwnerCatalog())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.selectedVault).toBeNull()
  })

  it('useOwnerCatalog_ApiFails_ReturnsErrorWithMessage', async () => {
    ownerApi.getVaults.mockRejectedValue(Object.assign(new Error('Không thể kết nối tới máy chủ.'), { status: 0 }))
    ownerApi.getAssets.mockResolvedValue([])
    ownerApi.getBeneficiaries.mockResolvedValue([])
    const { result } = renderHook(() => useOwnerCatalog())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('Không thể kết nối tới máy chủ.')
  })

  it('useOwnerCatalog_Reload_FetchesAgainAndRecovers', async () => {
    ownerApi.getVaults.mockRejectedValueOnce(new Error('Lỗi tạm thời'))
    ownerApi.getAssets.mockResolvedValue(assets)
    ownerApi.getBeneficiaries.mockResolvedValue(beneficiaries)
    const { result } = renderHook(() => useOwnerCatalog())
    await waitFor(() => expect(result.current.status).toBe('error'))

    ownerApi.getVaults.mockResolvedValue(vaults)
    act(() => result.current.reload())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(ownerApi.getVaults).toHaveBeenCalledTimes(2)
  })
})
