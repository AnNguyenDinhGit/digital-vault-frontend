import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'
import { getMockMode } from './mocks/mode'

// VITE_USE_MOCK=true: mock toàn bộ API (khi BE chưa chạy được).
// VITE_MOCK_MISSING_APIS=true: gọi BE thật, chỉ mock những API BE chưa có.
async function enableMocking() {
  const mode = getMockMode(import.meta.env)
  if (mode === 'off') return
  const { startMockApi } = await import('./mocks/browser')
  await startMockApi(mode)
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
