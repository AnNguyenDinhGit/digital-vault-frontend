import { downloadBlob, downloadTextFile } from './download'

describe('downloadTextFile', () => {
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:demo')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
  })

  it('downloadTextFile_Called_ClicksAnchorWithFilenameAndBlobUrl', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let anchor
    const append = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      anchor = node
      return node
    })
    downloadTextFile('nhat-ky.csv', 'a,b', 'text/csv;charset=utf-8')
    expect(anchor.download).toBe('nhat-ky.csv')
    expect(anchor.getAttribute('href')).toBe('blob:demo')
    expect(click).toHaveBeenCalledTimes(1)
    append.mockRestore()
  })

  it('downloadTextFile_Called_CreatesBlobWithGivenMimeAndReleasesUrl', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadTextFile('a.txt', 'xin chào')
    const blob = URL.createObjectURL.mock.calls[0][0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:demo')
  })
})

describe('downloadBlob', () => {
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:file')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    vi.restoreAllMocks()
  })

  it('downloadBlob_Called_UsesGivenBlobAndFilenameThenReleasesUrl', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let anchor
    const append = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      anchor = node
      return node
    })
    const blob = new Blob(['nội dung'], { type: 'application/pdf' })
    downloadBlob('SoTietKiem.pdf', blob)
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(anchor.download).toBe('SoTietKiem.pdf')
    expect(anchor.getAttribute('href')).toBe('blob:file')
    expect(click).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:file')
    append.mockRestore()
  })
})
