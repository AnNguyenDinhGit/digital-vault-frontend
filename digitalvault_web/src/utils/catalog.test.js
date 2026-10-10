import {
  assetCode,
  assetTypeLabel,
  attachBeneficiaries,
  buildStats,
  fileTypeLabel,
  filterAssets,
  formatAllocation,
  getInitials,
  getTypeTabs,
  paginate,
} from './catalog'

const doc = (overrides = {}) => ({ documentId: 1, fileName: 'a.pdf', fileType: 'application/pdf', isEncrypted: true, signatureValid: true, ...overrides })

const assets = [
  { assetId: 1, name: 'Ví Lạnh Crypto', type: 'CryptoWallet', description: 'Seed phrase', documents: [] },
  { assetId: 2, name: 'Tiết kiệm Vietcombank', type: 'BankAccount', description: 'Hợp đồng gửi', documents: [doc()] },
  { assetId: 3, name: 'Kho kỷ niệm', type: 'Document', description: null, documents: [doc({ signatureValid: false }), doc({ documentId: 2 })] },
  { assetId: 4, name: 'Ví Ledger', type: 'CryptoWallet', description: '', documents: [] },
]

const beneficiaries = [
  { assetId: 1, beneficiaryId: 10, fullName: 'Trần Bảo Long', allocation: 40, status: 'Active' },
  { assetId: 1, beneficiaryId: 11, fullName: 'Nguyễn Thị Mai', allocation: 60, status: 'Active' },
  { assetId: 2, beneficiaryId: 11, fullName: 'Nguyễn Thị Mai', allocation: 100, status: 'Active' },
]

describe('assetTypeLabel', () => {
  it('assetTypeLabel_KnownType_ReturnsVietnameseLabel', () => {
    expect(assetTypeLabel('CryptoWallet')).toBe('Crypto')
    expect(assetTypeLabel('BankAccount')).toBe('Ngân hàng')
  })

  it('assetTypeLabel_UnknownType_ReturnsRawType', () => {
    expect(assetTypeLabel('Painting')).toBe('Painting')
  })
})

describe('assetCode', () => {
  it('assetCode_KnownType_ReturnsPaddedCode', () => {
    expect(assetCode({ assetId: 1, type: 'CryptoWallet' })).toBe('#AST-CRYPTO-01')
    expect(assetCode({ assetId: 12, type: 'BankAccount' })).toBe('#AST-BANK-12')
  })

  it('assetCode_UnknownType_UsesUppercasePrefix', () => {
    expect(assetCode({ assetId: 3, type: 'Painting' })).toBe('#AST-PAINTI-03')
  })
})

describe('getInitials', () => {
  it('getInitials_FullVietnameseName_UsesLastTwoWords', () => {
    expect(getInitials('Trần Bảo Long')).toBe('BL')
    expect(getInitials('Đặng Hoàng Yến')).toBe('HY')
  })

  it('getInitials_SingleWord_UsesFirstTwoLetters', () => {
    expect(getInitials('An')).toBe('AN')
  })

  it('getInitials_EmptyOrBlank_ReturnsPlaceholder', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })
})

describe('fileTypeLabel', () => {
  it('fileTypeLabel_KnownMime_ReturnsShortLabel', () => {
    expect(fileTypeLabel('application/pdf')).toBe('PDF')
    expect(fileTypeLabel('image/png')).toBe('PNG')
    expect(fileTypeLabel('image/jpeg')).toBe('JPEG')
    expect(fileTypeLabel('text/plain')).toBe('TXT')
  })

  it('fileTypeLabel_UnknownMime_UsesUppercaseSubtype', () => {
    expect(fileTypeLabel('application/zip')).toBe('ZIP')
  })

  it('fileTypeLabel_EmptyMime_ReturnsFile', () => {
    expect(fileTypeLabel('')).toBe('FILE')
    expect(fileTypeLabel(undefined)).toBe('FILE')
  })
})

describe('formatAllocation', () => {
  it('formatAllocation_WholeAndDecimal_ReturnsPercentText', () => {
    expect(formatAllocation(40)).toBe('40%')
    expect(formatAllocation(33.33)).toBe('33.33%')
  })
})

describe('attachBeneficiaries', () => {
  it('attachBeneficiaries_Assets_GroupsBeneficiariesByAssetId', () => {
    const result = attachBeneficiaries(assets, beneficiaries)
    expect(result[0].beneficiaries).toHaveLength(2)
    expect(result[1].beneficiaries).toHaveLength(1)
    expect(result[2].beneficiaries).toEqual([])
  })

  it('attachBeneficiaries_Assets_DoesNotMutateInput', () => {
    attachBeneficiaries(assets, beneficiaries)
    expect(assets[0]).not.toHaveProperty('beneficiaries')
  })
})

describe('buildStats', () => {
  it('buildStats_Catalog_CountsAssetsAndUniqueBeneficiaries', () => {
    const stats = buildStats(assets, beneficiaries)
    expect(stats.totalAssets).toBe(4)
    expect(stats.beneficiaryCount).toBe(2)
  })

  it('buildStats_Catalog_CountsDocumentedAndMissingDocuments', () => {
    const stats = buildStats(assets, beneficiaries)
    // Tài sản 2 và 3 có giấy tờ đính kèm; owner endpoint của BE không trả signatureValid nên không tính theo chữ ký
    expect(stats.documentedCount).toBe(2)
    expect(stats.missingDocumentCount).toBe(2)
  })

  it('buildStats_AllDocumentsEncrypted_ReturnsHundredPercent', () => {
    expect(buildStats(assets, beneficiaries).encryptedPercent).toBe(100)
  })

  it('buildStats_NoDocuments_ReturnsNullEncryptedPercent', () => {
    expect(buildStats([assets[0]], []).encryptedPercent).toBeNull()
  })

  it('buildStats_EmptyCatalog_ReturnsZeros', () => {
    expect(buildStats([], [])).toEqual({
      totalAssets: 0,
      beneficiaryCount: 0,
      documentedCount: 0,
      missingDocumentCount: 0,
      encryptedPercent: null,
    })
  })
})

describe('getTypeTabs', () => {
  it('getTypeTabs_Assets_ReturnsAllTabFirstWithCounts', () => {
    const tabs = getTypeTabs(assets)
    expect(tabs[0]).toEqual({ key: 'all', label: 'Tất cả', count: 4 })
    expect(tabs.find((t) => t.key === 'CryptoWallet')).toEqual({ key: 'CryptoWallet', label: 'Crypto', count: 2 })
  })

  it('getTypeTabs_UnknownType_AppendsTabAfterKnownTypes', () => {
    const tabs = getTypeTabs([...assets, { assetId: 9, name: 'Tranh', type: 'Painting', description: '', documents: [] }])
    expect(tabs[tabs.length - 1]).toEqual({ key: 'Painting', label: 'Painting', count: 1 })
  })

  it('getTypeTabs_NoAssets_ReturnsOnlyAllTab', () => {
    expect(getTypeTabs([])).toEqual([{ key: 'all', label: 'Tất cả', count: 0 }])
  })
})

describe('filterAssets', () => {
  const withBeneficiaries = attachBeneficiaries(assets, beneficiaries)

  it('filterAssets_NoFilter_ReturnsAll', () => {
    expect(filterAssets(withBeneficiaries, { query: '', type: 'all' })).toHaveLength(4)
  })

  it('filterAssets_ByType_ReturnsOnlyThatType', () => {
    const result = filterAssets(withBeneficiaries, { query: '', type: 'CryptoWallet' })
    expect(result.map((a) => a.assetId)).toEqual([1, 4])
  })

  it('filterAssets_QueryIgnoresCaseAndDiacritics_MatchesName', () => {
    const result = filterAssets(withBeneficiaries, { query: 'tiet kiem', type: 'all' })
    expect(result.map((a) => a.assetId)).toEqual([2])
  })

  it('filterAssets_QueryMatchesDescription_ReturnsAsset', () => {
    expect(filterAssets(withBeneficiaries, { query: 'SEED', type: 'all' }).map((a) => a.assetId)).toEqual([1])
  })

  it('filterAssets_QueryMatchesBeneficiaryName_ReturnsAssets', () => {
    const result = filterAssets(withBeneficiaries, { query: 'bao long', type: 'all' })
    expect(result.map((a) => a.assetId)).toEqual([1])
  })

  it('filterAssets_QueryAndType_CombinesBoth', () => {
    expect(filterAssets(withBeneficiaries, { query: 'ledger', type: 'BankAccount' })).toEqual([])
  })

  it('filterAssets_NullDescription_DoesNotThrow', () => {
    expect(() => filterAssets(withBeneficiaries, { query: 'x', type: 'all' })).not.toThrow()
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 10 }, (_, i) => i + 1)

  it('paginate_FirstPage_ReturnsFirstSlice', () => {
    expect(paginate(items, 1, 4)).toEqual({ items: [1, 2, 3, 4], page: 1, totalPages: 3, total: 10, from: 1, to: 4 })
  })

  it('paginate_LastPage_ReturnsRemainder', () => {
    expect(paginate(items, 3, 4)).toEqual({ items: [9, 10], page: 3, totalPages: 3, total: 10, from: 9, to: 10 })
  })

  it('paginate_PageOutOfRange_ClampsToLastPage', () => {
    expect(paginate(items, 99, 4).page).toBe(3)
    expect(paginate(items, 0, 4).page).toBe(1)
  })

  it('paginate_Empty_ReturnsOnePageWithZeroRange', () => {
    expect(paginate([], 1, 4)).toEqual({ items: [], page: 1, totalPages: 1, total: 0, from: 0, to: 0 })
  })
})
