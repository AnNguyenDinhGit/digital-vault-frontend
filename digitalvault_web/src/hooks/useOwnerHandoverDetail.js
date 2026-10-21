import { useCallback, useEffect, useState } from 'react'
import { getAssets, getBeneficiaries, getOwnerHandover } from '../callapi/ownerApi'

const INITIAL_STATE = { key: null, status: 'loading', error: null, handover: null, assetNames: {}, beneficiaryNames: {} }

const toNameMap = (rows, idKey, nameKey) => Object.fromEntries(rows.map((row) => [row[idKey], row[nameKey]]))

// Một hồ sơ bàn giao nhìn từ Owner kèm tên tài sản và người thụ hưởng; tên là phần phụ, tải lỗi thì hiển thị theo mã
export function useOwnerHandoverDetail(requestId) {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getOwnerHandover(requestId),
      getAssets().catch(() => []),
      getBeneficiaries().catch(() => []),
    ])
      .then(([handover, assets, beneficiaries]) => {
        if (cancelled) return
        setState({
          key: requestId,
          status: 'ready',
          error: null,
          handover,
          assetNames: toNameMap(assets, 'assetId', 'name'),
          beneficiaryNames: toNameMap(beneficiaries, 'beneficiaryId', 'fullName'),
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
