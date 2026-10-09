import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import OwnerLayout from './components/layout/OwnerLayout'
import ProtectedRoute from './components/routing/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import AssetCatalogPage from './pages/owner/AssetCatalogPage'
import AssetDetailPage from './pages/owner/AssetDetailPage'
import OwnerPlaceholderPage from './pages/owner/OwnerPlaceholderPage'

// Component gốc: khai báo provider và các route của ứng dụng
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<ProtectedRoute role="Owner" />}>
            <Route path="/owner" element={<OwnerLayout />}>
              <Route index element={<Navigate to="assets" replace />} />
              <Route path="assets" element={<AssetCatalogPage />} />
              <Route path="assets/:assetId" element={<AssetDetailPage />} />
              <Route path="beneficiaries" element={<OwnerPlaceholderPage title="Người thụ hưởng" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
