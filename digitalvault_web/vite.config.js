import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Cấu hình Vite: proxy /api sang BE để cookie SameSite=Strict hoạt động (cùng origin khi dev)
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
    },
  }
})
