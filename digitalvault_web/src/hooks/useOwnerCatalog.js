import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAssets, getBeneficiaries, getOwnerHandovers, getVaults } from '../callapi/ownerApi'
import { attachBeneficiaries } from '../utils/catalog'

// Tải danh sách kho trước để biết kho đang xem, rồi tải song song tài sản của kho đó, người thụ hưởng và hồ sơ bàn giao
async function fetchCatalog(selectedVaultId) {
  const vaults = await getVaults()
  const target = vaults.find((vault) => vault.vaultId === selectedVaultId) ?? vaults[0] ?? null
  // Hồ sơ bàn giao chỉ để cảnh báo kho bị khóa nên lỗi tải không làm hỏng cả trang (BE vẫn chặn khi lưu)
  const [assets, beneficiaries, handovers] = await Promise.all([
    target ? getAssets(target.vaultId) : [],
    getBeneficiaries(),
    getOwnerHandovers().catch(() => []),
  ])
  return { vaults, assets, beneficiaries, handovers, assetsVaultId: target?.vaultId ?? null }
}

// assetsVaultId: kho mà danh sách assets đang giữ thuộc về
const INITIAL_STATE = { status: 'loading', error: '', vaults: [], assets: [], beneficiaries: [], handovers: [], assetsVaultId: null }

// Dữ liệu danh mục tài sản: trạng thái tải, danh sách kho/tài sản và kho đang chọn
export function useOwnerCatalog() {
  const [state, setState] = useState(INITIAL_STATE)
  const [selectedVaultId, setSelectedVaultId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchCatalog(selectedVaultId)
      .then((data) => {
        if (!cancelled) setState({ ...INITIAL_STATE, ...data, status: 'ready' })
      })
      .catch((error) => {
        if (!cancelled) setState({ ...INITIAL_STATE, status: 'error', error: error?.message || 'Đã có lỗi xảy ra.' })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey, selectedVaultId])

  const reload = useCallback(() => {
    setState(INITIAL_STATE)
    setReloadKey((key) => key + 1)
  }, [])

  // Chưa chọn kho nào hoặc kho đã chọn không còn thì dùng kho đầu tiên
  const selectedVault = useMemo(
    () => state.vaults.find((vault) => vault.vaultId === selectedVaultId) ?? state.vaults[0] ?? null,
    [state.vaults, selectedVaultId],
  )

  // Đổi kho thì tài sản của kho mới còn đang tải: không hiện nhầm tài sản của kho cũ
  const assetsReady = state.status === 'ready' && state.assetsVaultId === (selectedVault?.vaultId ?? null)

  // Chỉ giữ người thụ hưởng của các tài sản đang hiển thị để số liệu thống kê đúng theo kho
  const beneficiaries = useMemo(() => {
    if (!assetsReady) return []
    const assetIds = new Set(state.assets.map((asset) => asset.assetId))
    return state.beneficiaries.filter((item) => assetIds.has(item.assetId))
  }, [assetsReady, state.assets, state.beneficiaries])

  const assets = useMemo(() => (assetsReady ? attachBeneficiaries(state.assets, beneficiaries) : []), [assetsReady, state.assets, beneficiaries])

  return {
    status: state.status,
    error: state.error,
    vaults: state.vaults,
    assets,
    beneficiaries,
    assetsLoading: state.status === 'ready' && !assetsReady,
    handovers: state.handovers,
    selectedVault,
    selectVault: setSelectedVaultId,
    reload,
  }
}
