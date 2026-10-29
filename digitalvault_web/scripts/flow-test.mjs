/* global process */
// Kiểm thử luồng trọn vẹn trên BE đã deploy: Owner → Executor → LegalVerifier → Beneficiary.
// Script CHỈ dùng tài khoản có sẵn (không tự đăng ký) và đọc thông tin đăng nhập từ biến môi trường, không ghi ra file.
// Cách chạy: xem phần USAGE bên dưới hoặc chạy `node scripts/flow-test.mjs` không tham số để xem hướng dẫn.
// Script TẠO dữ liệu thật trên BE (kho, tài sản, hồ sơ bàn giao tiền tố "[FLOW-TEST]"), chỉ chạy trên môi trường được phép.
import { createInterface } from 'node:readline/promises'

const USAGE = `
Cần 4 tài khoản có sẵn (biến môi trường, không có dấu cách thừa):
  OWNER_EMAIL / OWNER_PASSWORD               tài khoản chủ kho (role Owner)
  BENEFICIARY_EMAIL / BENEFICIARY_PASSWORD   tài khoản sẽ được chỉ định thụ hưởng
  EXECUTOR_EMAIL / EXECUTOR_PASSWORD         tài khoản đã được Admin cấp role Executor
  VERIFIER_EMAIL / VERIFIER_PASSWORD         tài khoản đã được Admin cấp role LegalVerifier
Tuỳ chọn:
  BASE_URL            mặc định https://vault-owner-be.huydevops.id.vn
  BENEFICIARY_OTP     mã OTP nếu đã biết (không thì script sẽ hỏi khi tới bước người thụ hưởng)
Tài khoản bật xác thực hai lớp (2FA) chưa được hỗ trợ: hãy tắt 2FA của 4 tài khoản test trước.

PowerShell (ví dụ):
  $env:OWNER_EMAIL='...'; $env:OWNER_PASSWORD='...'; (làm tương tự cho 3 tài khoản còn lại)
  node scripts/flow-test.mjs
`

const ACCOUNTS = ['OWNER', 'BENEFICIARY', 'EXECUTOR', 'VERIFIER']
const missing = ACCOUNTS.flatMap((name) => [`${name}_EMAIL`, `${name}_PASSWORD`]).filter((key) => !process.env[key])
if (missing.length > 0) {
  console.log(`Thiếu biến môi trường: ${missing.join(', ')}\n${USAGE}`)
  process.exit(1)
}

const BASE_URL = (process.env.BASE_URL || 'https://vault-owner-be.huydevops.id.vn').replace(/\/$/, '')
const TAG = `[FLOW-TEST] ${new Date().toISOString().slice(0, 19)}`
const results = []
const sessions = {}
const state = {}

// Gọi API, trả { status, body }; không ném lỗi theo status để từng bước tự kiểm tra
async function call(who, method, path, { json, form, query } = {}) {
  const url = new URL(`${BASE_URL}/api${path}`)
  Object.entries(query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value))
  const headers = { Accept: 'application/json', 'X-Vault-Request': '1' }
  if (who) headers.Authorization = `Bearer ${sessions[who].accessToken}`
  if (json !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(url, { method, headers, body: form ?? (json !== undefined ? JSON.stringify(json) : undefined) })
  const text = await response.text()
  let body = text
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // Giữ nguyên chuỗi khi không phải JSON
  }
  return { status: response.status, body }
}

// Danh sách BE có thể trả mảng hoặc PageDto { items }: chấp nhận cả hai
const itemsOf = (body) => (Array.isArray(body) ? body : (body?.items ?? []))
const short = (body) => {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return text && text.length > 220 ? `${text.slice(0, 220)}...` : text
}

// Chạy một bước: fn trả về { status, body, ok } hoặc ném lỗi; kết quả được ghi để in bảng tổng kết
async function step(name, fn) {
  try {
    const { status, body, note } = await fn()
    const ok = note?.startsWith('OK') ?? (status >= 200 && status < 300)
    results.push({ name, status, ok, detail: note ?? short(body) })
    console.log(`${ok ? '✔' : '✘'} ${name} → HTTP ${status}${note ? ` (${note})` : ''}`)
    if (!ok) console.log(`    ${short(body)}`)
    return { status, body, ok }
  } catch (error) {
    results.push({ name, status: 0, ok: false, detail: String(error.message) })
    console.log(`✘ ${name} → lỗi: ${error.message}`)
    return { status: 0, body: null, ok: false }
  }
}

const textFile = (name, content) => new File([content], name, { type: 'text/plain' })
const signature = () => new File([crypto.getRandomValues(new Uint8Array(64))], 'signature.sig', { type: 'application/octet-stream' })

async function login(who) {
  const prefix = process.env[`${who}_EMAIL`]
  const res = await step(`Đăng nhập ${who}`, async () => {
    const r = await call(null, 'POST', '/auth/login', { json: { email: prefix, password: process.env[`${who}_PASSWORD`] } })
    if (r.status === 202) return { ...r, note: 'tài khoản bật 2FA, chưa hỗ trợ', ok: false }
    if (r.status === 200) {
      sessions[who] = r.body
      return { ...r, body: { userId: r.body.userId, roles: r.body.roles }, note: `OK roles=${r.body.roles}` }
    }
    return r
  })
  return res.ok
}

async function run() {
  console.log(`BE: ${BASE_URL}\nThẻ dữ liệu test: ${TAG}\n`)
  const loggedIn = await Promise.all(ACCOUNTS.map(login))
  if (!loggedIn.every(Boolean)) return console.log('\nKhông đăng nhập được đủ 4 tài khoản, dừng.')
  const need = { EXECUTOR: 'Executor', VERIFIER: 'LegalVerifier', OWNER: 'Owner' }
  for (const [who, role] of Object.entries(need)) {
    if (!sessions[who].roles.includes(role)) return console.log(`\nTài khoản ${who} không có role ${role} (cần Admin cấp), dừng.`)
  }

  // ---- Owner ----
  const vault = await step('Owner: tạo kho', () => call('OWNER', 'POST', '/owner/vaults', { json: { name: `${TAG} kho`, description: null } }))
  if (vault.ok) state.vaultId = vault.body.vaultId
  else {
    const list = await step('Owner: dùng lại kho đã có', async () => {
      const r = await call('OWNER', 'GET', '/owner/vaults')
      return { ...r, note: itemsOf(r.body).length ? 'OK dùng kho đầu tiên' : 'chưa có kho nào' }
    })
    state.vaultId = itemsOf(list.body)[0]?.vaultId
  }
  if (!state.vaultId) return console.log('\nKhông có kho để làm tiếp, dừng.')

  const asset = await step('Owner: tạo tài sản', () =>
    call('OWNER', 'POST', '/owner/assets', { json: { vaultId: state.vaultId, name: `${TAG} tài sản`, type: 'Other', description: null } }))
  if (!asset.ok) return
  state.assetId = asset.body.assetId

  await step('Owner: upload giấy tờ (File + Signature)', () => {
    const form = new FormData()
    form.append('File', textFile('flow-test.txt', 'Tai lieu thu nghiem luong BE'))
    form.append('Signature', signature())
    return call('OWNER', 'POST', `/owner/assets/${state.assetId}/documents`, { form })
  })

  const assign = await step('Owner: chỉ định người thụ hưởng 100%', () =>
    call('OWNER', 'POST', `/owner/assets/${state.assetId}/beneficiaries`, { json: { email: process.env.BENEFICIARY_EMAIL, allocation: 100 } }))
  console.log(`    Trạng thái phân bổ do BE trả: ${assign.body?.status ?? '(không có)'} — kỳ vọng Active theo BE mới`)

  await step('Owner: gán Executor cho kho', () =>
    call('OWNER', 'PUT', `/owner/vaults/${state.vaultId}/executor`, { json: { executorId: sessions.EXECUTOR.userId } }))

  const create = await step('Owner: tạo hồ sơ bàn giao (POST /owner/vaults/{id}/handovers)', () =>
    call('OWNER', 'POST', `/owner/vaults/${state.vaultId}/handovers`))
  if (create.ok) state.requestId = create.body.requestId

  // ---- Executor ----
  await step('Executor: danh sách kho được phân công', async () => {
    const r = await call('EXECUTOR', 'GET', '/executor/assignments')
    const found = itemsOf(r.body).some((item) => item.vaultId === state.vaultId)
    return { ...r, note: found ? 'OK thấy kho vừa gán' : 'KHÔNG thấy kho vừa gán', ok: found }
  })

  if (!state.requestId) {
    const made = await step('Executor: tạo hồ sơ bàn giao', () => call('EXECUTOR', 'POST', `/executor/assignments/${state.vaultId}/handovers`))
    if (made.ok) state.requestId = made.body.requestId
  }
  if (!state.requestId) return console.log('\nKhông có hồ sơ bàn giao để làm tiếp, dừng.')

  await step('Executor: nộp giấy chứng tử', () => {
    const form = new FormData()
    form.append('File', textFile('giay-chung-tu.txt', 'Giay chung tu thu nghiem'))
    form.append('Signature', signature())
    return call('EXECUTOR', 'POST', `/executor/handovers/${state.requestId}/death-certificate`, { form })
  })

  await step('Executor: gửi thẩm định pháp lý', () => {
    const form = new FormData()
    form.append('VerifierId', String(sessions.VERIFIER.userId))
    form.append('Comment', 'Gui tham dinh trong luong kiem thu')
    form.append('Evidence', textFile('bang-chung.txt', 'Bang chung thu nghiem'))
    return call('EXECUTOR', 'POST', `/executor/handovers/${state.requestId}/legal-verifications`, { form })
  })

  // ---- LegalVerifier ----
  await step('Verifier: danh sách hồ sơ (status=Pending_Legal)', async () => {
    const r = await call('VERIFIER', 'GET', '/legal/handovers', { query: { status: 'Pending_Legal' } })
    const found = itemsOf(r.body).some((item) => item.requestId === state.requestId)
    return { ...r, note: found ? 'OK thấy hồ sơ vừa gửi' : 'KHÔNG thấy hồ sơ vừa gửi', ok: found }
  })
  await step('Verifier: xem chi tiết hồ sơ', () => call('VERIFIER', 'GET', `/legal/handovers/${state.requestId}`))
  await step('Verifier: duyệt hồ sơ', () => call('VERIFIER', 'POST', `/legal/handovers/${state.requestId}/approve`, { json: { comment: 'Duyet trong luong kiem thu' } }))

  // ---- Executor hoàn tất ----
  await step('Executor: bắt đầu bàn giao', () => call('EXECUTOR', 'POST', `/executor/handovers/${state.requestId}/start`))
  await step('Executor: hoàn tất bàn giao (File + Signature)', () => {
    const form = new FormData()
    form.append('File', textFile('bien-ban.txt', 'Bien ban ban giao thu nghiem'))
    form.append('Signature', signature())
    return call('EXECUTOR', 'POST', `/executor/handovers/${state.requestId}/complete`, { form })
  })

  // ---- Beneficiary ----
  await step('Beneficiary: xem tài sản khi CHƯA nhập OTP (kỳ vọng bị chặn)', async () => {
    const r = await call('BENEFICIARY', 'GET', '/beneficiary/assets')
    const blocked = r.status >= 400
    return { ...r, note: blocked ? `OK bị chặn (${r.status})` : 'KHÔNG bị chặn, cần xem lại', ok: blocked }
  })
  const otp = await step('Beneficiary: yêu cầu OTP', () => call('BENEFICIARY', 'POST', '/beneficiary/otp/request'))
  if (otp.ok) {
    let code = process.env.BENEFICIARY_OTP
    if (!code) {
      const rl = createInterface({ input: process.stdin, output: process.stdout })
      code = (await rl.question(`    Nhập mã OTP 6 số gửi tới ${process.env.BENEFICIARY_EMAIL}: `)).trim()
      rl.close()
    }
    await step('Beneficiary: xác thực OTP', () => call('BENEFICIARY', 'POST', '/beneficiary/otp/verify', { json: { challengeId: otp.body.challengeId, code } }))
  }
  await step('Beneficiary: danh sách tài sản thừa kế', async () => {
    const r = await call('BENEFICIARY', 'GET', '/beneficiary/assets')
    const found = itemsOf(r.body).some((item) => item.asset?.assetId === state.assetId)
    return { ...r, note: found ? 'OK thấy tài sản vừa chỉ định' : 'KHÔNG thấy tài sản vừa chỉ định', ok: found }
  })
  const cases = await step('Beneficiary: danh sách hồ sơ bàn giao', () => call('BENEFICIARY', 'GET', '/beneficiary/handovers'))
  const handoverId = itemsOf(cases.body)[0]?.handoverId
  if (handoverId) {
    await step('Beneficiary: chi tiết hồ sơ', () => call('BENEFICIARY', 'GET', `/beneficiary/handovers/${handoverId}`))
    await step('Beneficiary: xác nhận biên nhận', () => call('BENEFICIARY', 'POST', `/beneficiary/handovers/${handoverId}/receipt`, { json: { note: 'Da nhan trong luong kiem thu' } }))
    await step('Beneficiary: xem biên nhận', () => call('BENEFICIARY', 'GET', `/beneficiary/handovers/${handoverId}/receipt`))
  }
  await step('Beneficiary: thông báo', () => call('BENEFICIARY', 'GET', '/notifications'))
  await step('Admin-only: Owner không được gọi /admin/users (kỳ vọng 403)', async () => {
    const r = await call('OWNER', 'GET', '/admin/users')
    return { ...r, note: r.status === 403 ? 'OK 403' : `status ${r.status}`, ok: r.status === 403 }
  })
}

await run()
console.log('\n===== TỔNG KẾT =====')
results.forEach((item) => console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}  [${item.status}]`))
const failed = results.filter((item) => !item.ok).length
console.log(`\n${results.length - failed}/${results.length} bước đạt. Dữ liệu test mang thẻ: ${TAG} (vaultId=${state.vaultId ?? '?'}, requestId=${state.requestId ?? '?'}).`)
process.exit(failed > 0 ? 1 : 0)
