import axiosClient from './axiosClient'

// API cổng Thẩm Định Pháp Lý / Công Chứng (role LegalVerifier)
// Hồ sơ bàn giao, tải giấy tờ chứng tử / bằng chứng, tải tài liệu tài sản và các hành động duyệt/từ chối/yêu cầu bổ sung

/**
 * Lấy danh sách hồ sơ bàn giao theo phân trang và trạng thái
 * @param {{ page?: number, pageSize?: number, status?: string }} params
 * @returns {Promise<{ page: number, pageSize: number, items: Array }>}
 */
export async function getLegalHandovers({ page = 1, pageSize = 20, status = '' } = {}) {
  const params = { page, pageSize }
  if (status) params.status = status
  const { data } = await axiosClient.get('/legal/handovers', { params })
  return data
}

/**
 * Lấy thông tin chi tiết một hồ sơ bàn giao
 * @param {number|string} requestId
 */
export async function getLegalHandover(requestId) {
  const { data } = await axiosClient.get(`/legal/handovers/${requestId}`)
  return data
}

/**
 * Tải giấy tờ chứng tử hoặc bằng chứng Executor đã nộp trong hồ sơ
 * @param {number|string} requestId
 * @param {number|string} documentId
 * @returns {Promise<{ blob: Blob, signatureValid: boolean }>}
 */
export async function downloadLegalHandoverDocument(requestId, documentId) {
  const response = await axiosClient.get(`/legal/handovers/${requestId}/documents/${documentId}/content`, {
    responseType: 'blob',
  })
  return {
    blob: response.data,
    signatureValid: response.headers?.['x-signature-valid'] === 'true',
  }
}

/**
 * Tải tài liệu đính kèm của tài sản trong hồ sơ bàn giao
 * @param {number|string} requestId
 * @param {number|string} documentId
 * @returns {Promise<{ blob: Blob }>}
 */
export async function downloadLegalAssetDocument(requestId, documentId) {
  const response = await axiosClient.get(`/legal/handovers/${requestId}/asset-documents/${documentId}/content`, {
    responseType: 'blob',
  })
  return {
    blob: response.data,
  }
}

/**
 * Phê duyệt hồ sơ pháp lý (chỉ khả dụng khi status là Pending_Legal)
 * @param {number|string} requestId
 * @param {{ comment: string }} input
 * @returns {Promise<{ verificationId: number, requestId: number, verifierId: number, status: string, comment: string, submittedAt: string, reviewedAt: string }>}
 */
export async function approveLegalHandover(requestId, { comment }) {
  const trimmed = comment?.trim() ?? ''
  const { data } = await axiosClient.post(`/legal/handovers/${requestId}/approve`, {
    comment: trimmed,
  })
  return data
}

/**
 * Từ chối hồ sơ pháp lý
 * @param {number|string} requestId
 * @param {{ comment: string }} input
 */
export async function rejectLegalHandover(requestId, { comment }) {
  const trimmed = comment?.trim() ?? ''
  const { data } = await axiosClient.post(`/legal/handovers/${requestId}/reject`, {
    comment: trimmed,
  })
  return data
}

/**
 * Yêu cầu Executor bổ sung thêm thông tin/bằng chứng cho hồ sơ
 * @param {number|string} requestId
 * @param {{ comment: string }} input
 */
export async function requestAdditionalInfoLegalHandover(requestId, { comment }) {
  const trimmed = comment?.trim() ?? ''
  const { data } = await axiosClient.post(`/legal/handovers/${requestId}/request-additional-information`, {
    comment: trimmed,
  })
  return data
}
