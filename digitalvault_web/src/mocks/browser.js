import { setupWorker } from 'msw/browser'
import { setMockLatency } from './db'
import { handlers } from './handlers'

const worker = setupWorker(...handlers)

// Bật mock API trên trình duyệt, thêm độ trễ nhỏ để nhìn thấy trạng thái loading
export async function startMockApi() {
  setMockLatency(300)
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
