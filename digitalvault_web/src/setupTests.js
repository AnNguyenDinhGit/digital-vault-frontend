import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'
import { clearTokens } from './utils/tokenStorage'

// Máy bận (nhiều file test chạy song song) làm findBy/waitFor dễ vượt 1 giây mặc định
configure({ asyncUtilTimeout: 5000 })

// Dọn DOM và token đăng nhập sau mỗi test để các test không ảnh hưởng nhau
afterEach(() => {
  cleanup()
  clearTokens()
})
