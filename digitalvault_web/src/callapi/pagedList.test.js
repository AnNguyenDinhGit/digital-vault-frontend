import axiosClient from './axiosClient'
import { getAllPages } from './pagedList'

vi.mock('./axiosClient', () => ({ default: { get: vi.fn() } }))

const rows = (count, start = 0) => Array.from({ length: count }, (_, index) => ({ id: start + index }))

beforeEach(() => {
  axiosClient.get.mockReset()
})

describe('getAllPages', () => {
  it('getAllPages_PlainArrayResponse_ReturnsItAfterOneCall', async () => {
    axiosClient.get.mockResolvedValue({ data: rows(3) })
    await expect(getAllPages('/owner/assets')).resolves.toEqual(rows(3))
    expect(axiosClient.get).toHaveBeenCalledTimes(1)
  })

  it('getAllPages_SinglePageDto_ReturnsItems', async () => {
    axiosClient.get.mockResolvedValue({ data: { page: 1, pageSize: 100, items: rows(5) } })
    await expect(getAllPages('/owner/assets')).resolves.toEqual(rows(5))
    expect(axiosClient.get).toHaveBeenCalledWith('/owner/assets', { params: { page: 1, pageSize: 100 } })
  })

  it('getAllPages_FullFirstPage_FetchesNextPageAndConcatenates', async () => {
    axiosClient.get
      .mockResolvedValueOnce({ data: { page: 1, pageSize: 100, items: rows(100) } })
      .mockResolvedValueOnce({ data: { page: 2, pageSize: 100, items: rows(7, 100) } })
    const result = await getAllPages('/owner/vaults')
    expect(result).toHaveLength(107)
    expect(axiosClient.get).toHaveBeenNthCalledWith(2, '/owner/vaults', { params: { page: 2, pageSize: 100 } })
  })

  it('getAllPages_ExtraParams_AreSentOnEveryPage', async () => {
    axiosClient.get.mockResolvedValue({ data: { page: 1, pageSize: 100, items: [] } })
    await getAllPages('/owner/beneficiaries', { assetId: 4 })
    expect(axiosClient.get).toHaveBeenCalledWith('/owner/beneficiaries', { params: { assetId: 4, page: 1, pageSize: 100 } })
  })

  it('getAllPages_MissingItems_ReturnsEmptyList', async () => {
    axiosClient.get.mockResolvedValue({ data: { page: 1, pageSize: 100 } })
    await expect(getAllPages('/owner/assets')).resolves.toEqual([])
  })

  it('getAllPages_ServerKeepsReturningFullPages_StopsAtPageLimit', async () => {
    axiosClient.get.mockResolvedValue({ data: { page: 1, pageSize: 100, items: rows(100) } })
    const result = await getAllPages('/owner/assets')
    expect(axiosClient.get).toHaveBeenCalledTimes(50)
    expect(result).toHaveLength(5000)
  })

  it('getAllPages_RequestFails_PropagatesError', async () => {
    axiosClient.get.mockImplementation(async () => {
      throw new Error('boom')
    })
    await expect(getAllPages('/owner/assets')).rejects.toThrow('boom')
  })
})
