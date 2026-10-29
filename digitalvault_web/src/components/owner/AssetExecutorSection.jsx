import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVaults } from '../../callapi/ownerApi'
import { useVaultExecutor } from '../../hooks/useVaultExecutor'
import { executorBadgeClass, executorStatusLabel } from '../../utils/executor'

function SingleVaultExecutor({ vaultId }) {
  const { status, data } = useVaultExecutor(vaultId)
  if (status === 'loading') return <p className="mb-0 fs-12 text-slate-500">Đang tải người thi hành...</p>
  if (!data) return <p className="mb-0 fs-12 text-slate-500">Kho này chưa có người thi hành.</p>
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
      <div style={{ minWidth: 0 }}>
        <p className="mb-0 fs-13 fw-semibold text-ink">{data.fullName}</p>
        <p className="mb-0 fs-12 text-slate-500">{data.organization}</p>
      </div>
      <span className={`av-badge ${executorBadgeClass(data.status)}`}>{executorStatusLabel(data.status)}</span>
    </div>
  )
}

// Mục "Digital Executor giám sát" ở trang chi tiết tài sản.
// AssetDto không có vaultId nên chỉ hiển thị trực tiếp khi Owner có đúng một kho.
export default function AssetExecutorSection() {
  const [vaults, setVaults] = useState(null)

  useEffect(() => {
    let cancelled = false
    getVaults()
      .then((data) => {
        if (!cancelled) setVaults(data)
      })
      .catch(() => {
        if (!cancelled) setVaults([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="av-panel d-flex flex-column gap-2" aria-labelledby="executor-title">
      <h2 id="executor-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
        Digital Executor giám sát
      </h2>
      {vaults === null && <p className="mb-0 fs-12 text-slate-500">Đang tải người thi hành...</p>}
      {vaults?.length === 1 && <SingleVaultExecutor vaultId={vaults[0].vaultId} />}
      {vaults !== null && vaults.length !== 1 && (
        <p className="mb-0 fs-12 text-slate-500">Người thi hành được gán theo từng kho. Mở trang quản lý để xem chi tiết.</p>
      )}
      <Link to="/owner/executor" className="fs-12 fw-semibold text-decoration-none">
        Quản lý người thi hành
      </Link>
    </section>
  )
}
