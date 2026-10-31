import { useEffect, useState } from 'react'
import { getAssignments } from '../callapi/executorApi'
import { vaultNamesOf } from '../utils/executor'

// Tên kho của Executor: HandoverDto của BE chỉ có vaultId nên lấy tên từ danh sách phân công (vaultName).
// Lỗi hoặc chưa có tên thì trả null để giao diện hiện "Kho #id".
export function useVaultName(vaultId) {
  const [names, setNames] = useState(() => new Map())

  useEffect(() => {
    let cancelled = false
    getAssignments()
      .then((assignments) => {
        if (!cancelled) setNames(vaultNamesOf(assignments))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return names.get(vaultId) ?? null
}
