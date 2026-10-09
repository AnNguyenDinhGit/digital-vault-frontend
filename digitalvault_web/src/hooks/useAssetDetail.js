import { useCallback, useEffect, useState } from 'react'
import { getAsset, getBeneficiaries } from '../callapi/ownerApi'

// Tải song song chi tiết tài sản và danh sách người thụ hưởng của tài sản đó
async function fetchDetail(assetId) {
  const [asset, beneficiaries] = await Promise.all([getAsset(assetId), getBeneficiaries(assetId)])
  return { asset, beneficiaries }
}

const INITIAL_STATE = { status: 'loading', error: null, asset: null, beneficiaries: [] }

// Dữ liệu trang chi tiết tài sản; refresh tải lại ngầm, giữ nguyên dữ liệu cũ trên màn hình trong lúc tải
export function useAssetDetail(assetId) {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchDetail(assetId)
      .then((data) => {
        if (!cancelled) setState({ ...INITIAL_STATE, ...data, status: 'ready' })
      })
      .catch((error) => {
        if (!cancelled) setState({ ...INITIAL_STATE, status: 'error', error })
      })
    return () => {
      cancelled = true
    }
  }, [assetId, reloadKey])

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  return { ...state, refresh }
}
