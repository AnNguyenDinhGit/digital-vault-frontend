import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAssets, getBeneficiaries, getVaults } from '../callapi/ownerApi'
import { attachBeneficiaries } from '../utils/catalog'

// Tải song song kho, tài sản và người thụ hưởng của Owner đang đăng nhập
async function fetchCatalog() {
  const [vaults, assets, beneficiaries] = await Promise.all([getVaults(), getAssets(), getBeneficiaries()])
  return { vaults, assets, beneficiaries }
}

const INITIAL_STATE = { status: 'loading', error: '', vaults: [], assets: [], beneficiaries: [] }

// Dữ liệu danh mục tài sản: trạng thái tải, danh sách kho/tài sản và kho đang chọn
export function useOwnerCatalog() {
  const [state, setState] = useState(INITIAL_STATE)
  const [selectedVaultId, setSelectedVaultId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchCatalog()
      .then((data) => {
        if (!cancelled) setState({ ...INITIAL_STATE, ...data, status: 'ready' })
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

  // Chưa chọn kho nào hoặc kho đã chọn không còn thì dùng kho đầu tiên
  const selectedVault = useMemo(
    () => state.vaults.find((vault) => vault.vaultId === selectedVaultId) ?? state.vaults[0] ?? null,
    [state.vaults, selectedVaultId],
  )

  const assets = useMemo(() => attachBeneficiaries(state.assets, state.beneficiaries), [state.assets, state.beneficiaries])

  return {
    status: state.status,
    error: state.error,
    vaults: state.vaults,
    assets,
    beneficiaries: state.beneficiaries,
    selectedVault,
    selectVault: setSelectedVaultId,
    reload,
  }
}
