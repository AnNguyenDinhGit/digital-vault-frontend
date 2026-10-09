import { useContext } from 'react'
import { AuthContext } from '../contexts/authContextInstance'

// Hook truy cập trạng thái đăng nhập, bắt buộc dùng bên trong AuthProvider
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
