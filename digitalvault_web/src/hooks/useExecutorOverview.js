import { useCallback, useEffect, useState } from 'react'
import { getAssets, getProofOfLife, getVaults } from '../callapi/ownerApi'

const INITIAL_STATE = { status: 'loading', error: '', vaults: [], assetCount: 0, proofOfLife: null }

const fetchProofOfLife = () => getProofOfLife().catch((error) => (error?.status === 404 ? null : Promise.reject(error)))

// Kho, số tài sản và cấu hình điểm danh của Owner (404 = chưa thiết lập), dùng cho trang quản lý người thi hành
export function useExecutorOverview() {
  const [state, setState] = useState(INITIAL_STATE)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getVaults(), getAssets(), fetchProofOfLife()])
      .then(([vaults, assets, proofOfLife]) => {
        if (!cancelled) setState({ status: 'ready', error: '', vaults, assetCount: assets.length, proofOfLife })
      })
      .catch((error) => {
        if (!cancelled) setState({ ...INITIAL_STATE, status: 'error', error: error?.message || 'Đã có lỗi xảy ra.' })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = useCallback(() => {
    setState(INITIAL_STATE)
    setReloadKey((key) => key + 1)
  }, [])

  return { ...state, reload }
}
