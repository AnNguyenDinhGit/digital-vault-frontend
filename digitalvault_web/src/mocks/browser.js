import { setupWorker } from 'msw/browser'
import { setMockHybrid, setMockLatency } from './db'
import { handlers, hybridHandlers } from './handlers'

// Bật mock API trên trình duyệt, thêm độ trễ nhỏ để nhìn thấy trạng thái loading.
// mode 'hybrid' chỉ mock API BE chưa có, các request còn lại đi thẳng tới BE thật.
export async function startMockApi(mode = 'full') {
  setMockLatency(300)
  setMockHybrid(mode === 'hybrid')
  const worker = setupWorker(...(mode === 'hybrid' ? hybridHandlers : handlers))
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
