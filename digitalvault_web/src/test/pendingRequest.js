import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, getDb, saveDb } from '../mocks/db'

// Dựng hồ sơ Pending_Executor như thật: Owner demo lập một kho đủ giấy tờ và 100% phân bổ rồi tạo hồ sơ
// (BE tự gán Executor 5). Sau đó đăng nhập lại bằng Executor đó. Dùng axios thẳng để chạy được ở cả test Node lẫn jsdom.
export async function createPendingRequest(status = 'Pending_Executor') {
  const executor = ROLE_ACCOUNTS.find((account) => account.role === 'Executor')
  await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
  const { data: vault } = await axiosClient.post('/owner/vaults', { name: 'Kho chờ tiếp nhận', description: null })
  const { data: asset } = await axiosClient.post('/owner/assets', { vaultId: vault.vaultId, name: 'Tài sản chờ tiếp nhận', type: 'Other' })
  getDb().assets.find((item) => item.assetId === asset.assetId).documents.push({ documentId: 970 + asset.assetId, fileName: 'a.pdf', fileType: 'application/pdf', isEncrypted: true, signatureValid: null })
  saveDb()
  await axiosClient.post(`/owner/assets/${asset.assetId}/beneficiaries`, { email: 'long.tran@example.com', allocation: 100 })
  const { data: request } = await axiosClient.post(`/owner/vaults/${vault.vaultId}/handovers`)
  if (status !== 'Pending_Executor') {
    getDb().handovers.find((item) => item.requestId === request.requestId).status = status
    saveDb()
  }
  await axiosClient.post('/auth/login', { email: executor.email, password: executor.password })
  return { requestId: request.requestId, vaultId: vault.vaultId, assetId: asset.assetId }
}
