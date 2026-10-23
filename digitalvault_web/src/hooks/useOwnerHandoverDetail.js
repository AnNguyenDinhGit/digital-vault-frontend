import { useCallback, useEffect, useState } from 'react'
import { getAssets, getBeneficiaries, getExecutorDetail, getNotifications, getOwnerHandover } from '../callapi/ownerApi'
import { declineReasonFromNotifications } from '../utils/handover'

const INITIAL_STATE = { key: null, status: 'loading', error: null, handover: null, assetNames: {}, beneficiaryNames: {}, executorName: null, declineReason: null }

const toNameMap = (rows, idKey, nameKey) => Object.fromEntries(rows.map((row) => [row[idKey], row[nameKey]]))

// Tên Executor: ưu tiên tên BE đã trả trong hồ sơ, không thì tra chi tiết Executor (404 nếu không còn đủ điều kiện); null khi không biết
const lookupExecutorName = async (handover) => {
  if (handover.executorName) return handover.executorName
  if (!handover.executorId) return null
  try {
    return (await getExecutorDetail(handover.executorId, handover.vaultId)).fullName ?? null
  } catch {
    return null
  }
}

// Lý do Executor từ chối: ưu tiên trường BE trả trong hồ sơ, không thì tìm trong thông báo của Owner
const lookupDeclineReason = async (handover) => {
  if (handover.status !== 'Declined') return null
  if (handover.declineReason) return handover.declineReason
  try {
    return declineReasonFromNotifications(await getNotifications(), handover.requestId)
  } catch {
    return null
  }
}

// Một hồ sơ bàn giao nhìn từ Owner kèm tên tài sản, người thụ hưởng và Executor; các tên là phần phụ, tải lỗi thì hiển thị theo mã
export function useOwnerHandoverDetail(requestId) {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getOwnerHandover(requestId)
      .then(async (handover) => {
        const [assets, beneficiaries, executorName, declineReason] = await Promise.all([
          getAssets().catch(() => []),
          getBeneficiaries().catch(() => []),
          lookupExecutorName(handover),
          lookupDeclineReason(handover),
        ])
        if (cancelled) return
        setState({
          key: requestId,
          status: 'ready',
          error: null,
          handover,
          assetNames: toNameMap(assets, 'assetId', 'name'),
          beneficiaryNames: toNameMap(beneficiaries, 'beneficiaryId', 'fullName'),
          executorName,
          declineReason,
        })
      })
      .catch((error) => {
        if (!cancelled) setState({ ...INITIAL_STATE, key: requestId, status: 'error', error })
      })
    return () => {
      cancelled = true
    }
  }, [requestId, reloadKey])

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])
  const loading = state.key !== requestId

  return { ...state, status: loading ? 'loading' : state.status, reload }
}
