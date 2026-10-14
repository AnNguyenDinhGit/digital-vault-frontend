import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { clearTokens } from './utils/tokenStorage'

// Dọn DOM và token đăng nhập sau mỗi test để các test không ảnh hưởng nhau
afterEach(() => {
  cleanup()
  clearTokens()
})
