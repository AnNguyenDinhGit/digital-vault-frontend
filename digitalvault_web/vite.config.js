import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Cấu hình Vite: proxy /api sang BE để gọi cùng origin khi dev, không phải cấu hình CORS
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      // Giữ port của template Visual Studio (launch.json đang trỏ tới port này)
      port: 50808,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'https://localhost:7015',
          changeOrigin: true,
          // BE dev dùng chứng chỉ tự ký của dotnet dev-certs
          secure: false,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.js',
      css: false,
      // Bộ test lớn chạy song song, các test gõ phím nhiều (đăng ký, đăng nhập) dễ vượt 5 giây mặc định khi máy bận
      testTimeout: 20000,
    },
  }
})
