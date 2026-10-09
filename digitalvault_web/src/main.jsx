import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'

// Khi BE chưa chạy được, bật VITE_USE_MOCK=true để dùng API giả (MSW) theo đúng contract của BE
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return
  const { startMockApi } = await import('./mocks/browser')
  await startMockApi()
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
