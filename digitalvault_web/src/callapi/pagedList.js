import axiosClient from './axiosClient'

const PAGE_SIZE = 100
const MAX_PAGES = 50

// Các API danh sách của BE trả PageDto { page, pageSize, items } (tối đa 100 dòng mỗi trang): đọc lần lượt các trang rồi gộp lại.
// Chấp nhận cả mảng thuần (bản BE cũ và mock) để FE chạy được với cả hai.
export async function getAllPages(path, params = {}) {
  const items = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data } = await axiosClient.get(path, { params: { ...params, page, pageSize: PAGE_SIZE } })
    if (Array.isArray(data)) return data
    const pageItems = data?.items ?? []
    items.push(...pageItems)
    if (pageItems.length < PAGE_SIZE) break
  }
  return items
}
