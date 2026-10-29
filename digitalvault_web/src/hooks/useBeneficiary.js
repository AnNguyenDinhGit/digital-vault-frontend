import { useCallback, useContext, useEffect, useState } from 'react'
import {
  getBeneficiaryHandover,
  getBeneficiaryHandoverDocuments,
  getBeneficiaryHandovers,
  getHandoverReceipt,
  getInheritedAsset,
  getInheritedAssets,
} from '../callapi/beneficiaryApi'
import { BeneficiaryOtpContext } from '../contexts/beneficiaryOtpContextInstance'
import { isOtpRequiredError } from '../utils/beneficiary'

// Trạng thái OTP của cổng Người thụ hưởng; null khi dùng ngoài BeneficiaryOtpGate
export function useBeneficiaryOtp() {
  return useContext(BeneficiaryOtpContext)
}

// Gọi một API và theo dõi trạng thái loading/ready/error; lỗi yêu cầu OTP sẽ mở lại cổng xác thực
function useApiResource(loader) {
  const otp = useBeneficiaryOtp()
  const invalidate = otp?.invalidate
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    loader()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, error: null })
      })
      .catch((error) => {
        if (cancelled) return
        setState({ status: 'error', data: null, error })
        if (isOtpRequiredError(error)) invalidate?.()
      })
    return () => {
      cancelled = true
    }
  }, [loader, reloadKey, invalidate])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setReloadKey((key) => key + 1)
  }, [])

  // Cập nhật dữ liệu tại chỗ (sau khi xác nhận biên nhận) mà không tải lại
  const update = useCallback((updater) => {
    setState((current) => (current.status === 'ready' ? { ...current, data: updater(current.data) } : current))
  }, [])

  return { ...state, reload, update }
}

// Danh sách tài sản được thừa kế
export function useInheritedAssets() {
  const loader = useCallback(() => getInheritedAssets(), [])
  const { data, ...rest } = useApiResource(loader)
  return { ...rest, items: data ?? [] }
}

// Chi tiết một tài sản thụ hưởng
export function useInheritedAsset(assetId) {
  const loader = useCallback(() => getInheritedAsset(assetId), [assetId])
  const { data, ...rest } = useApiResource(loader)
  return { ...rest, inheritance: data }
}

// Tìm tài sản tương ứng với từng hồ sơ bàn giao (CaseDto chỉ có assetId)
function assetIndex(inheritances) {
  const map = new Map()
  inheritances.forEach((item) => {
    if (item?.asset) map.set(item.asset.assetId, item)
  })
  return map
}

// Tiến trình bàn giao: các hồ sơ kèm thông tin tài sản; withReceipts lấy thêm biên nhận của từng hồ sơ
// Biên nhận chỉ có thể tồn tại khi hồ sơ đã bàn giao xong hoặc đã được xác nhận; các trạng thái khác chắc chắn chưa có (404)
const hasReceiptStatus = (status) => status === 'Completed' || status === 'Received'

export function useBeneficiaryHandovers({ withReceipts = false } = {}) {
  const loader = useCallback(async () => {
    const [cases, inheritances] = await Promise.all([getBeneficiaryHandovers(), getInheritedAssets()])
    const assets = assetIndex(inheritances)
    // Chỉ 404 được coi là "chưa có biên nhận" (getHandoverReceipt đã đổi thành null); lỗi khác (mạng, OTP hết hạn, 5xx) được ném ra
    const receipts = withReceipts
      ? await Promise.all(cases.map((item) => (hasReceiptStatus(item.status) ? getHandoverReceipt(item.handoverId) : null)))
      : []
    return cases
      .map((item, index) => ({
        ...item,
        inheritance: assets.get(item.assetId) ?? null,
        receipt: withReceipts ? receipts[index] : undefined,
      }))
      .sort((a, b) => b.handoverId - a.handoverId)
  }, [withReceipts])
  const { data, ...rest } = useApiResource(loader)
  return { ...rest, items: data ?? [] }
}

// Chi tiết hồ sơ bàn giao: trạng thái, giấy tờ, biên nhận và tài sản liên quan
export function useBeneficiaryHandoverDetail(handoverId) {
  const loader = useCallback(async () => {
    const [handover, documents, receipt] = await Promise.all([
      getBeneficiaryHandover(handoverId),
      getBeneficiaryHandoverDocuments(handoverId),
      getHandoverReceipt(handoverId),
    ])
    // Thông tin tài sản không bắt buộc: lỗi thì vẫn hiện tiến trình
    const inheritance = handover?.assetId ? await getInheritedAsset(handover.assetId).catch(() => null) : null
    return { handover, documents, receipt, inheritance }
  }, [handoverId])
  return useApiResource(loader)
}
