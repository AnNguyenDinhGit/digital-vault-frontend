import { beforeEach, describe, expect, it, vi } from 'vitest'
import axiosClient from './axiosClient'
import { getHandoverOverview } from './adminApi'

vi.mock('./axiosClient', () => ({ default: { get: vi.fn() } }))

describe('getHandoverOverview', () => {
  beforeEach(() => vi.resetAllMocks())

  it('overview_Filters_CallsAdminHandoversWithOnlyFilledParams', async () => {
    axiosClient.get.mockResolvedValue({ data: { page: 1, pageSize: 20, items: [] } })
    await getHandoverOverview({ page: 2, pageSize: 10, status: 'Completed', ownerId: '5' })
    expect(axiosClient.get).toHaveBeenCalledWith('/admin/handovers', { params: { page: 2, pageSize: 10, status: 'Completed', ownerId: '5' } })
    await getHandoverOverview()
    expect(axiosClient.get).toHaveBeenLastCalledWith('/admin/handovers', { params: { page: 1, pageSize: 20 } })
  })
})
