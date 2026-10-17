import { bypass } from 'msw'

// Dựng request gửi tới BE thật từ request gốc của axios: giữ phương thức, Bearer token và header chống CSRF
export function buildForwardRequest(request, body) {
  const headers = { Accept: 'application/json', 'X-Vault-Request': '1' }
  const authorization = request.headers.get('Authorization')
  if (authorization) headers.Authorization = authorization
  if (body !== null && body !== undefined) headers['Content-Type'] = 'application/json'
  return new Request(request.url, {
    method: request.method,
    headers,
    body: body === null || body === undefined ? undefined : JSON.stringify(body),
  })
}

// Chế độ hỗn hợp: gửi thao tác ghi thật lên BE (bỏ qua MSW) để chỉ phần BE chưa có mới là dữ liệu mô phỏng
export const forwardToBackend = (request, body) => fetch(bypass(buildForwardRequest(request, body)))
