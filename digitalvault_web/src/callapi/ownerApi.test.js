import axiosClient from './axiosClient'
import {
  assignBeneficiary,
  createAsset,
  createVault,
  getAsset,
  getAssets,
  getBeneficiaries,
  getVault,
  getVaults,
} from './ownerApi'

vi.mock('./axiosClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

describe('ownerApi', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('getVaults_Called_GetsVaultsAndReturnsData', async () => {
    axiosClient.get.mockResolvedValue({ data: [{ vaultId: 1 }] })
    await expect(getVaults()).resolves.toEqual([{ vaultId: 1 }])
    expect(axiosClient.get).toHaveBeenCalledWith('/owner/vaults')
  })

  it('getVault_WithId_GetsVaultById', async () => {
    axiosClient.get.mockResolvedValue({ data: { vaultId: 7 } })
    await expect(getVault(7)).resolves.toEqual({ vaultId: 7 })
    expect(axiosClient.get).toHaveBeenCalledWith('/owner/vaults/7')
  })

  it('createVault_ValidInput_PostsTrimmedNameAndDescription', async () => {
    axiosClient.post.mockResolvedValue({ data: { vaultId: 2 } })
    await createVault({ name: '  Kho moi  ', description: ' Mo ta ' })
    expect(axiosClient.post).toHaveBeenCalledWith('/owner/vaults', { name: 'Kho moi', description: 'Mo ta' })
  })

  it('createVault_BlankDescription_SendsNullDescription', async () => {
    axiosClient.post.mockResolvedValue({ data: {} })
    await createVault({ name: 'Kho', description: '   ' })
    expect(axiosClient.post.mock.calls[0][1].description).toBeNull()
  })

  it('getAssets_Called_GetsAssets', async () => {
    axiosClient.get.mockResolvedValue({ data: [{ assetId: 1 }] })
    await expect(getAssets()).resolves.toEqual([{ assetId: 1 }])
    expect(axiosClient.get).toHaveBeenCalledWith('/owner/assets')
  })

  it('getAsset_WithId_GetsAssetById', async () => {
    axiosClient.get.mockResolvedValue({ data: { assetId: 3 } })
    await expect(getAsset(3)).resolves.toEqual({ assetId: 3 })
    expect(axiosClient.get).toHaveBeenCalledWith('/owner/assets/3')
  })

  it('createAsset_ExtraFields_SendsOnlyContractFields', async () => {
    axiosClient.post.mockResolvedValue({ data: { assetId: 9 } })
    await createAsset({ vaultId: 1, name: ' Tai san ', type: 'BankAccount', description: 'Mo ta', status: 'Active' })
    expect(axiosClient.post).toHaveBeenCalledWith('/owner/assets', {
      vaultId: 1,
      name: 'Tai san',
      type: 'BankAccount',
      description: 'Mo ta',
    })
  })

  it('createAsset_NoDescription_SendsNullDescription', async () => {
    axiosClient.post.mockResolvedValue({ data: {} })
    await createAsset({ vaultId: 1, name: 'A', type: 'Other' })
    expect(axiosClient.post.mock.calls[0][1].description).toBeNull()
  })

  it('getBeneficiaries_WithoutAssetId_GetsAllWithoutParams', async () => {
    axiosClient.get.mockResolvedValue({ data: [] })
    await getBeneficiaries()
    expect(axiosClient.get).toHaveBeenCalledWith('/owner/beneficiaries', { params: undefined })
  })

  it('getBeneficiaries_WithAssetId_SendsAssetIdParam', async () => {
    axiosClient.get.mockResolvedValue({ data: [] })
    await getBeneficiaries(10)
    expect(axiosClient.get).toHaveBeenCalledWith('/owner/beneficiaries', { params: { assetId: 10 } })
  })

  it('assignBeneficiary_ValidInput_PostsTrimmedEmailAndAllocation', async () => {
    axiosClient.post.mockResolvedValue({ data: { beneficiaryId: 5 } })
    await expect(assignBeneficiary(4, { email: ' long@example.com ', allocation: 40 })).resolves.toEqual({
      beneficiaryId: 5,
    })
    expect(axiosClient.post).toHaveBeenCalledWith('/owner/assets/4/beneficiaries', {
      email: 'long@example.com',
      allocation: 40,
    })
  })
})
