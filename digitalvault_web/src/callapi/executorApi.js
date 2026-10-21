import axiosClient from './axiosClient'
import { getAllPages } from './pagedList'

// API cổng Executor của BE (role Executor): phân công, hồ sơ bàn giao, nộp bằng chứng, xác minh pháp lý, hoàn tất.

export async function getAssignments() {
  return getAllPages('/executor/assignments')
}

// Tạo hồ sơ bàn giao ở trạng thái Draft cho kho đã được phân công
export async function createHandover(vaultId) {
  const { data } = await axiosClient.post(`/executor/assignments/${vaultId}/handovers`)
  return data
}

export async function getHandovers() {
  return getAllPages('/executor/handovers')
}

export async function getHandover(requestId) {
  const { data } = await axiosClient.get(`/executor/handovers/${requestId}`)
  return data
}

// Multipart của BE: File bắt buộc, Signature (chữ ký rời) tuỳ chọn
function documentForm({ file, signature }) {
  const form = new FormData()
  form.append('File', file)
  if (signature) form.append('Signature', signature)
  return form
}

export async function uploadDeathCertificate(requestId, input) {
  const { data } = await axiosClient.post(`/executor/handovers/${requestId}/death-certificate`, documentForm(input))
  return data
}

export async function uploadEvidence(requestId, input) {
  const { data } = await axiosClient.post(`/executor/handovers/${requestId}/documents`, documentForm(input))
  return data
}

// Gửi hồ sơ cho người xác minh pháp lý: VerifierId, Comment (tuỳ chọn), Evidence
export async function requestLegalVerification(requestId, { verifierId, comment, evidence }) {
  const form = new FormData()
  form.append('VerifierId', String(verifierId))
  const trimmed = comment?.trim()
  if (trimmed) form.append('Comment', trimmed)
  form.append('Evidence', evidence)
  const { data } = await axiosClient.post(`/executor/handovers/${requestId}/legal-verifications`, form)
  return data
}

export async function startHandover(requestId) {
  await axiosClient.post(`/executor/handovers/${requestId}/start`)
}

// Hoàn tất bàn giao: File và Signature đều bắt buộc
export async function completeHandover(requestId, { file, signature }) {
  const form = new FormData()
  form.append('File', file)
  form.append('Signature', signature)
  await axiosClient.post(`/executor/handovers/${requestId}/complete`, form)
}

// Nội dung giấy tờ của hồ sơ; header X-Signature-Valid cho biết chữ ký rời có hợp lệ không
export async function downloadHandoverDocument(requestId, documentId) {
  const response = await axiosClient.get(`/executor/handovers/${requestId}/documents/${documentId}/content`, { responseType: 'blob' })
  return { blob: response.data, signatureValid: response.headers?.['x-signature-valid'] === 'true' }
}

// Chỉ có ở mock: giả lập người xác minh pháp lý duyệt hồ sơ (BE chưa có cổng xác minh trên giao diện)
export async function simulateLegalApproval(requestId) {
  const { data } = await axiosClient.post(`/executor/handovers/${requestId}/simulate-approval`)
  return data
}
