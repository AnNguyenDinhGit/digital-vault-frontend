import axiosClient from './axiosClient'
import {
  assignBeneficiary,
  createAsset,
  createVault,
  getAsset,
  getAssets,
  assignExecutor,
  getActivityLogs,
  getBeneficiaries,
  getExecutors,
  getProofOfLife,
  getVault,
  getVaultExecutor,
  getVaults,
  pingProofOfLife,
  revokeExecutor,
  saveProofOfLife,
  simulateExecutorAccept,
  simulateTimePassing,
  uploadDocument,
} from './ownerApi'

vi.mock('./axiosClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
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

  describe('uploadDocument', () => {
    const file = new File(['pdf'], 'HopDong.pdf', { type: 'application/pdf' })
    const signature = new File(['sig'], 'HopDong.sig')
    const certificate = new File(['cert'], 'ChungTu.pdf', { type: 'application/pdf' })

    const sentForm = () => axiosClient.post.mock.calls[0][1]

    it('uploadDocument_Alive_PostsMultipartWithSignatureAndNoCertificate', async () => {
      axiosClient.post.mockResolvedValue({ data: { documentId: 9 } })
      await expect(uploadDocument(4, { file, beneficiaryId: 11, ownerAlive: true, signature })).resolves.toEqual({ documentId: 9 })
      expect(axiosClient.post.mock.calls[0][0]).toBe('/owner/assets/4/documents')
      const form = sentForm()
      expect(form).toBeInstanceOf(FormData)
      expect(form.get('file').name).toBe('HopDong.pdf')
      expect(form.get('beneficiaryId')).toBe('11')
      expect(form.get('ownerAlive')).toBe('true')
      expect(form.get('signature').name).toBe('HopDong.sig')
      expect(form.has('deathCertificate')).toBe(false)
    })

    it('uploadDocument_Dead_PostsMultipartWithCertificateAndNoSignature', async () => {
      axiosClient.post.mockResolvedValue({ data: {} })
      await uploadDocument(4, { file, beneficiaryId: 11, ownerAlive: false, deathCertificate: certificate })
      const form = sentForm()
      expect(form.get('ownerAlive')).toBe('false')
      expect(form.get('deathCertificate').name).toBe('ChungTu.pdf')
      expect(form.has('signature')).toBe(false)
    })

    it('uploadDocument_AliveBranch_IgnoresStrayCertificate', async () => {
      axiosClient.post.mockResolvedValue({ data: {} })
      await uploadDocument(4, { file, beneficiaryId: 11, ownerAlive: true, signature, deathCertificate: certificate })
      expect(sentForm().has('deathCertificate')).toBe(false)
    })
  })

  it('getActivityLogs_Called_GetsLogsAndReturnsData', async () => {
    axiosClient.get.mockResolvedValue({ data: [{ logId: 1 }] })
    await expect(getActivityLogs()).resolves.toEqual([{ logId: 1 }])
    expect(axiosClient.get).toHaveBeenCalledWith('/owner/activity-logs')
  })

  describe('executor', () => {
    it('getExecutors_Called_GetsCandidates', async () => {
      axiosClient.get.mockResolvedValue({ data: [{ executorId: 5 }] })
      await expect(getExecutors()).resolves.toEqual([{ executorId: 5 }])
      expect(axiosClient.get).toHaveBeenCalledWith('/owner/executors')
    })

    it('getVaultExecutor_VaultId_GetsAssignmentOfThatVault', async () => {
      axiosClient.get.mockResolvedValue({ data: { vaultId: 3 } })
      await expect(getVaultExecutor(3)).resolves.toEqual({ vaultId: 3 })
      expect(axiosClient.get).toHaveBeenCalledWith('/owner/vaults/3/executor')
    })

    it('assignExecutor_VaultAndExecutor_PutsExecutorId', async () => {
      axiosClient.put.mockResolvedValue({ data: { status: 'Pending' } })
      await expect(assignExecutor(3, '21')).resolves.toEqual({ status: 'Pending' })
      expect(axiosClient.put).toHaveBeenCalledWith('/owner/vaults/3/executor', { executorId: 21 })
    })

    it('revokeExecutor_VaultId_SendsDelete', async () => {
      axiosClient.delete.mockResolvedValue({ status: 204 })
      await revokeExecutor(3)
      expect(axiosClient.delete).toHaveBeenCalledWith('/owner/vaults/3/executor')
    })

    it('simulateExecutorAccept_VaultId_PostsAccept', async () => {
      axiosClient.post.mockResolvedValue({ data: { status: 'Active' } })
      await expect(simulateExecutorAccept(3)).resolves.toEqual({ status: 'Active' })
      expect(axiosClient.post).toHaveBeenCalledWith('/owner/vaults/3/executor/accept')
    })
  })

  describe('proof of life', () => {
    it('getProofOfLife_Called_GetsConfigAndReturnsData', async () => {
      axiosClient.get.mockResolvedValue({ data: { frequencyDays: 30 } })
      await expect(getProofOfLife()).resolves.toEqual({ frequencyDays: 30 })
      expect(axiosClient.get).toHaveBeenCalledWith('/owner/proof-of-life')
    })

    it('saveProofOfLife_StringValues_PutsIntegers', async () => {
      axiosClient.put.mockResolvedValue({ data: { frequencyDays: 14 } })
      await expect(saveProofOfLife({ frequencyDays: '14', gracePeriodDays: '3' })).resolves.toEqual({ frequencyDays: 14 })
      expect(axiosClient.put).toHaveBeenCalledWith('/owner/proof-of-life', { frequencyDays: 14, gracePeriodDays: 3 })
    })

    it('pingProofOfLife_Called_PostsPing', async () => {
      axiosClient.post.mockResolvedValue({ data: { status: 'Active' } })
      await expect(pingProofOfLife()).resolves.toEqual({ status: 'Active' })
      expect(axiosClient.post).toHaveBeenCalledWith('/owner/proof-of-life/ping')
    })

    it('simulateTimePassing_Days_PostsDays', async () => {
      axiosClient.post.mockResolvedValue({ data: { status: 'Warning' } })
      await simulateTimePassing(25)
      expect(axiosClient.post).toHaveBeenCalledWith('/owner/proof-of-life/simulate', { days: 25 })
    })
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
