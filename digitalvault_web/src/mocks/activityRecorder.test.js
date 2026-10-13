import axios from 'axios'
import { describeRequest, installActivityRecorder } from './activityRecorder'
import { getDb, resetMockDb, setMockHybrid } from './db'

beforeEach(() => {
  resetMockDb()
  sessionStorage.removeItem('aeterna.user')
})

describe('describeRequest', () => {
  const run = (method, url, status, data = {}, body) => describeRequest({ method, url, data: body }, status, data)

  it('describeRequest_Login_ReturnsLoginAction', () => {
    expect(run('post', '/auth/login', 200)).toMatchObject({ action: 'Login', result: 'Success' })
  })

  it('describeRequest_Logout_ReturnsLogoutAction', () => {
    expect(run('post', '/auth/logout', 204)).toMatchObject({ action: 'Logout' })
  })

  it('describeRequest_CreateVault_UsesVaultIdFromResponse', () => {
    expect(run('post', '/owner/vaults', 201, { vaultId: 5 })).toMatchObject({ action: 'CreateVault', entityType: 'DigitalVault', entityId: 5 })
  })

  it('describeRequest_CreateAsset_UsesAssetIdFromResponse', () => {
    expect(run('post', '/owner/assets', 201, { assetId: 8 })).toMatchObject({ action: 'CreateAsset', entityType: 'DigitalAsset', entityId: 8 })
  })

  it('describeRequest_AssignBeneficiary_UsesAssetIdFromUrl', () => {
    expect(run('post', '/owner/assets/12/beneficiaries', 201)).toMatchObject({ action: 'AssignBeneficiary', entityType: 'DigitalAsset', entityId: 12 })
  })

  it('describeRequest_UploadAlive_ResultIsAliveSigned', () => {
    const form = new FormData()
    form.append('ownerAlive', 'true')
    expect(run('post', '/owner/assets/3/documents', 200, {}, form)).toMatchObject({ action: 'UploadAssetDocument', entityId: 3, result: 'Alive_Signed' })
  })

  it('describeRequest_UploadDeceased_ResultIsPendingLegal', () => {
    const form = new FormData()
    form.append('ownerAlive', 'false')
    expect(run('post', '/owner/assets/3/documents', 200, {}, form)).toMatchObject({ result: 'Pending_Legal' })
  })

  it('describeRequest_ProofOfLifeSaveAndPing_ReturnActions', () => {
    expect(run('put', '/owner/proof-of-life', 200)).toMatchObject({ action: 'UpdateProofOfLife' })
    expect(run('post', '/owner/proof-of-life/ping', 200)).toMatchObject({ action: 'PingProofOfLife' })
  })

  it('describeRequest_ExecutorAssignAndRevoke_UseVaultIdFromUrl', () => {
    expect(run('put', '/owner/vaults/3/executor', 200)).toMatchObject({ action: 'AssignExecutor', entityType: 'DigitalVault', entityId: 3 })
    expect(run('delete', '/owner/vaults/3/executor', 204)).toMatchObject({ action: 'RevokeExecutor', entityType: 'DigitalVault', entityId: 3 })
  })

  it('describeRequest_UpdateAndDeleteAsset_UseAssetIdFromUrl', () => {
    expect(run('put', '/owner/assets/7', 200)).toMatchObject({ action: 'UpdateAsset', entityType: 'DigitalAsset', entityId: 7 })
    expect(run('delete', '/owner/assets/7', 204)).toMatchObject({ action: 'DeleteAsset', entityType: 'DigitalAsset', entityId: 7 })
  })

  it('describeRequest_UpdateAndRemoveBeneficiary_UseAssetIdFromUrl', () => {
    expect(run('put', '/owner/assets/7/beneficiaries/2', 200)).toMatchObject({ action: 'UpdateAllocation', entityType: 'DigitalAsset', entityId: 7 })
    expect(run('delete', '/owner/assets/7/beneficiaries/2', 204)).toMatchObject({ action: 'RemoveBeneficiary', entityType: 'DigitalAsset', entityId: 7 })
  })

  it('describeRequest_DownloadDocument_UsesAssetIdFromUrl', () => {
    expect(run('get', '/owner/assets/7/documents/12/download', 200)).toMatchObject({ action: 'DownloadDocument', entityType: 'DigitalAsset', entityId: 7 })
  })

  it('describeRequest_ExecutorAcceptSimulation_IsNotRecorded', () => {
    expect(run('post', '/owner/vaults/3/executor/accept', 200)).toBeNull()
  })

  it('describeRequest_ProfileAndPasswordChanges_ReturnActions', () => {
    expect(run('put', '/owner/profile', 200)).toMatchObject({ action: 'UpdateProfile' })
    expect(run('post', '/owner/change-password', 204)).toMatchObject({ action: 'ChangePassword' })
    expect(run('put', '/owner/security/two-factor', 200)).toMatchObject({ action: 'ToggleTwoFactor' })
  })

  it('describeRequest_ReadRequests_AreNotRecorded', () => {
    expect(run('get', '/owner/assets', 200)).toBeNull()
    expect(run('get', '/owner/activity-logs', 200)).toBeNull()
  })

  it('describeRequest_SimulateAndUnknown_AreNotRecorded', () => {
    expect(run('post', '/owner/proof-of-life/simulate', 200)).toBeNull()
    expect(run('post', '/something/else', 200)).toBeNull()
  })
})

describe('installActivityRecorder', () => {
  const makeClient = (response) => {
    const client = axios.create({ baseURL: '/api', adapter: async (config) => ({ data: response, status: 201, statusText: 'Created', headers: {}, config }) })
    installActivityRecorder(client)
    return client
  }

  it('interceptor_SuccessfulCreateAsset_StoresLogForCurrentUser', async () => {
    setMockHybrid(true)
    sessionStorage.setItem('aeterna.user', JSON.stringify({ userId: 42, roles: ['Owner'] }))
    await makeClient({ assetId: 9 }).post('/owner/assets', { name: 'A' })
    const logs = getDb().activityLogs.filter((l) => l.userId === 42)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ action: 'CreateAsset', entityType: 'DigitalAsset', entityId: 9, result: 'Success' })
    expect(typeof logs[0].timestamp).toBe('string')
  })

  it('interceptor_ReadRequest_StoresNothing', async () => {
    setMockHybrid(true)
    sessionStorage.setItem('aeterna.user', JSON.stringify({ userId: 42, roles: ['Owner'] }))
    await makeClient([]).get('/owner/assets')
    expect(getDb().activityLogs.filter((l) => l.userId === 42)).toHaveLength(0)
  })

  it('interceptor_NoSignedInUser_StoresNothing', async () => {
    const before = getDb().activityLogs.length
    await makeClient({ vaultId: 1 }).post('/owner/vaults', { name: 'K' })
    expect(getDb().activityLogs).toHaveLength(before)
  })
})
