// Chế độ mock:
// - full: mock toàn bộ API (BE chưa chạy được)
// - hybrid: gọi BE thật cho những API đã có, chỉ mock những API BE chưa có
// - off: không mock
export function getMockMode(env) {
  if (env?.VITE_USE_MOCK === 'true') return 'full'
  if (env?.VITE_MOCK_MISSING_APIS === 'true') return 'hybrid'
  return 'off'
}

export const MOCK_MODE = getMockMode(import.meta.env)
