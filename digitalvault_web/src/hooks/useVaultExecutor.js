import { useCallback, useEffect, useState } from 'react'
import { getVaultExecutor } from '../callapi/ownerApi'

const IDLE = { status: 'idle', data: null, error: '' }
const LOADING = { status: 'loading', data: null, error: '' }

// Người thi hành của một kho. data = null nghĩa là chưa gán (BE trả 404).
// Trạng thái được gắn với (vaultId, lần tải) nên đổi kho sẽ tự về "loading" mà không cần set state trong effect.
// apply nhận kết quả từ lệnh gán/thu hồi/chấp nhận để cập nhật ngay không cần tải lại.
export function useVaultExecutor(vaultId) {
  const [stored, setStored] = useState({ key: null, value: LOADING })
  const [reloadKey, setReloadKey] = useState(0)
  const hasVault = vaultId !== null && vaultId !== undefined
  const key = `${vaultId}:${reloadKey}`

  useEffect(() => {
    if (!hasVault) return undefined
    let cancelled = false
    getVaultExecutor(vaultId)
      .then((data) => {
        if (!cancelled) setStored({ key, value: { status: 'ready', data, error: '' } })
      })
      .catch((error) => {
        if (cancelled) return
        if (error?.status === 404) setStored({ key, value: { status: 'ready', data: null, error: '' } })
        else setStored({ key, value: { status: 'error', data: null, error: error?.message || 'Đã có lỗi xảy ra.' } })
      })
    return () => {
      cancelled = true
    }
  }, [vaultId, hasVault, key])

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])
  const apply = useCallback((data) => setStored({ key, value: { status: 'ready', data, error: '' } }), [key])

  if (!hasVault) return { ...IDLE, reload, apply }
  return { ...(stored.key === key ? stored.value : LOADING), reload, apply }
}
