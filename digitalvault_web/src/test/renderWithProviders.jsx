import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'

// Render component trong AuthProvider + router, kèm các route phụ để kiểm tra điều hướng
export function renderWithProviders(ui, { route = '/', path = '/', extraRoutes = [] } = {}) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          {extraRoutes.map(({ path: extraPath, element }) => (
            <Route key={extraPath} path={extraPath} element={element} />
          ))}
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}
