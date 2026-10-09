import { Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import AddAssetModal from '../../components/owner/AddAssetModal'
import AssetCard from '../../components/owner/AssetCard'
import AssetFilters from '../../components/owner/AssetFilters'
import CreateVaultModal from '../../components/owner/CreateVaultModal'
import Pagination from '../../components/owner/Pagination'
import StatCards from '../../components/owner/StatCards'
import VaultBanner from '../../components/owner/VaultBanner'
import { useOwnerCatalog } from '../../hooks/useOwnerCatalog'
import { buildStats, filterAssets, getTypeTabs, paginate } from '../../utils/catalog'

const DEFAULT_PAGE_SIZE = 4

// Trang "Danh mục tài sản số": banner kho, thống kê và danh sách tài sản có tìm kiếm, lọc, phân trang
export default function AssetCatalogPage() {
  const catalog = useOwnerCatalog()
  const { status, error, vaults, assets, beneficiaries, selectedVault, selectVault, reload } = catalog

  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [modal, setModal] = useState(null)

  const stats = useMemo(() => buildStats(assets, beneficiaries), [assets, beneficiaries])
  const tabs = useMemo(() => getTypeTabs(assets), [assets])
  const filtered = useMemo(() => filterAssets(assets, { query, type }), [assets, query, type])
  const pageData = paginate(filtered, page, pageSize)

  const closeModal = () => setModal(null)

  const handleQueryChange = (value) => {
    setQuery(value)
    setPage(1)
  }

  const handleTypeChange = (value) => {
    setType(value)
    setPage(1)
  }

  const handlePageSizeChange = (value) => {
    setPageSize(value)
    setPage(1)
  }

  const handleVaultCreated = (vault) => {
    closeModal()
    selectVault(vault.vaultId)
    reload()
  }

  const handleAssetCreated = () => {
    closeModal()
    reload()
  }

  if (status === 'loading') {
    return (
      <p role="status" className="d-flex align-items-center gap-3 fs-14 text-slate-500">
        <span className="spinner-border spinner-border-sm text-brand" aria-hidden="true" />
        Đang tải danh mục tài sản...
      </p>
    )
  }

  if (status === 'error') {
    return (
      <Alert variant="danger" className="av-alert d-flex align-items-center justify-content-between gap-3">
        <span>{error}</span>
        <Button type="button" variant="light" size="sm" className="border" onClick={reload}>
          Thử lại
        </Button>
      </Alert>
    )
  }

  const createVaultModal = <CreateVaultModal open={modal === 'vault'} onClose={closeModal} onCreated={handleVaultCreated} />

  if (!selectedVault) {
    return (
      <>
        <section className="av-panel av-empty">
          <p className="mb-3">Bạn chưa có kho lưu trữ nào.</p>
          <Button type="button" variant="primary" className="av-btn av-btn-sm" onClick={() => setModal('vault')}>
            Tạo kho đầu tiên
          </Button>
        </section>
        {createVaultModal}
      </>
    )
  }

  return (
    <div className="d-flex flex-column gap-4">
      <VaultBanner
        vault={selectedVault}
        vaults={vaults}
        onSelectVault={selectVault}
        onAddAsset={() => setModal('asset')}
        onCreateVault={() => setModal('vault')}
      />
      <StatCards stats={stats} />

      <section className="av-panel d-flex flex-column gap-3" aria-labelledby="catalog-title">
        <div>
          <h2 id="catalog-title" className="mb-1 fw-bold text-ink" style={{ fontSize: 17 }}>
            Danh Mục Tài Sản Số Trong Kho
          </h2>
          <p className="mb-0 fs-12 text-slate-500 d-flex align-items-center gap-2">
            <Lock size={12} aria-hidden="true" />
            Giấy tờ được mã hóa AES-256-GCM trước khi lưu trữ
          </p>
        </div>

        {assets.length === 0 ? (
          <div className="av-empty">
            <p className="mb-3">Kho này chưa có tài sản nào.</p>
            <Button type="button" variant="primary" className="av-btn av-btn-sm" onClick={() => setModal('asset')}>
              Thêm tài sản đầu tiên
            </Button>
          </div>
        ) : (
          <>
            <AssetFilters
              query={query}
              onQueryChange={handleQueryChange}
              tabs={tabs}
              activeType={type}
              onTypeChange={handleTypeChange}
            />
            {filtered.length === 0 ? (
              <p className="av-empty mb-0">Không tìm thấy tài sản phù hợp.</p>
            ) : (
              <div>
                {pageData.items.map((asset) => (
                  <AssetCard key={asset.assetId} asset={asset} />
                ))}
              </div>
            )}
            <Pagination
              pageData={pageData}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </section>

      <AddAssetModal open={modal === 'asset'} vault={selectedVault} onClose={closeModal} onCreated={handleAssetCreated} />
      {createVaultModal}
    </div>
  )
}
