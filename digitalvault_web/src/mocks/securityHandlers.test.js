import { setupServer } from 'msw/node'
import axiosClient from '../callapi/axiosClient'
import { DEMO_ACCOUNT, ROLE_ACCOUNTS, resetMockDb, setMockHybrid, setSessionUserId } from './db'
import { handlers } from './handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  resetMockDb()
  sessionStorage.removeItem('aeterna.user')
  await axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password })
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const call = async (promise) => {
  try {
    const response = await promise
    return { status: response.status, data: response.data }
  } catch (error) {
    return { status: error.status, message: error.message }
  }
}

const NEW_PASSWORD = 'MatKhauMoi#2026'
const changePassword = (body) =>
  call(axiosClient.post('/owner/change-password', { currentPassword: DEMO_ACCOUNT.password, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD, ...body }))

describe('mock profile', () => {
  it('get_DemoAccount_ReturnsProfileWithSecuritySettings', async () => {
    const result = await call(axiosClient.get('/owner/profile'))
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ userId: 1, fullName: 'Nguyễn Văn An', email: 'owner@example.com', phone: '0901234567', twoFactorEnabled: false })
    expect(Object.keys(result.data).sort()).toEqual(['email', 'fullName', 'identityNumber', 'passwordChangedAt', 'phone', 'twoFactorEnabled', 'userId'])
    expect(typeof result.data.passwordChangedAt).toBe('string')
  })

  it('get_NotLoggedIn_Returns401', async () => {
    setSessionUserId(null)
    expect((await call(axiosClient.get('/owner/profile'))).status).toBe(401)
  })

  it('get_NonOwnerRole_Returns403', async () => {
    const [{ email, password }] = ROLE_ACCOUNTS
    await axiosClient.post('/auth/login', { email, password })
    expect((await call(axiosClient.get('/owner/profile'))).status).toBe(403)
  })

  it('put_ValidInput_UpdatesNameAndPhone', async () => {
    const result = await call(axiosClient.put('/owner/profile', { fullName: '  Nguyễn Văn Bình ', phone: '0987 654 321' }))
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ fullName: 'Nguyễn Văn Bình', phone: '0987 654 321' })
    expect((await axiosClient.get('/owner/profile')).data).toMatchObject({ fullName: 'Nguyễn Văn Bình', phone: '0987 654 321' })
  })

  it('put_NullPhone_ClearsPhone', async () => {
    const result = await call(axiosClient.put('/owner/profile', { fullName: 'Nguyễn Văn An', phone: null }))
    expect(result.data.phone).toBeNull()
  })

  it.each([
    [{ fullName: '   ', phone: null }],
    [{ fullName: 'x'.repeat(101), phone: null }],
    [{ fullName: 'An', phone: 'abc' }],
    [{ fullName: 'An', phone: null, email: 'khac@example.com' }],
  ])('put_InvalidBody_Returns400', async (body) => {
    expect((await call(axiosClient.put('/owner/profile', body))).status).toBe(400)
  })
})

describe('mock change password', () => {
  it('post_ValidInput_Returns204AndNewPasswordWorks', async () => {
    expect((await changePassword({})).status).toBe(204)
    const profile = (await axiosClient.get('/owner/profile')).data
    expect(Date.now() - new Date(profile.passwordChangedAt).getTime()).toBeLessThan(60_000)
    expect((await call(axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: NEW_PASSWORD }))).status).toBe(200)
    expect((await call(axiosClient.post('/auth/login', { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password }))).status).toBe(401)
  })

  it('post_WrongCurrentPassword_Returns403', async () => {
    expect((await changePassword({ currentPassword: 'SaiMatKhau#123' })).status).toBe(403)
  })

  it('post_ConfirmMismatch_Returns400', async () => {
    expect((await changePassword({ confirmPassword: 'KhongKhop#2026x' })).status).toBe(400)
  })

  it.each([['ngan#1'], ['KhongCoSoDacBiet'], ['KhongCoKyTuDacBiet1']])('post_WeakNewPassword_Returns400', async (weak) => {
    expect((await changePassword({ newPassword: weak, confirmPassword: weak })).status).toBe(400)
  })

  it('post_SameAsCurrent_Returns400', async () => {
    expect((await changePassword({ newPassword: DEMO_ACCOUNT.password, confirmPassword: DEMO_ACCOUNT.password })).status).toBe(400)
  })

  it('post_UnknownField_Returns400', async () => {
    expect((await changePassword({ role: 'Admin' })).status).toBe(400)
  })
})

describe('mock two-factor', () => {
  it('put_Enable_ReturnsStateAndProfileReflectsIt', async () => {
    const result = await call(axiosClient.put('/owner/security/two-factor', { enabled: true }))
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ twoFactorEnabled: true })
    expect((await axiosClient.get('/owner/profile')).data.twoFactorEnabled).toBe(true)
  })

  it('put_Disable_TurnsItOffAgain', async () => {
    await axiosClient.put('/owner/security/two-factor', { enabled: true })
    expect((await axiosClient.put('/owner/security/two-factor', { enabled: false })).data).toEqual({ twoFactorEnabled: false })
  })

  it.each([[{}], [{ enabled: 'yes' }], [{ enabled: true, extra: 1 }]])('put_InvalidBody_Returns400', async (body) => {
    expect((await call(axiosClient.put('/owner/security/two-factor', body))).status).toBe(400)
  })
})

describe('mock profile in hybrid mode', () => {
  beforeEach(() => {
    setSessionUserId(null)
    setMockHybrid(true)
    sessionStorage.setItem('aeterna.user', JSON.stringify({ userId: 42, roles: ['Owner'], email: 'that@example.com' }))
  })

  it('get_RealBackendUser_UsesEmailFromFrontendSession', async () => {
    const result = await call(axiosClient.get('/owner/profile'))
    expect(result.status).toBe(200)
    expect(result.data).toMatchObject({ userId: 42, email: 'that@example.com', fullName: '', phone: null, twoFactorEnabled: false })
  })

  it('put_RealBackendUser_KeepsEditsInMockOverlay', async () => {
    await axiosClient.put('/owner/profile', { fullName: 'Người Thật', phone: null })
    expect((await axiosClient.get('/owner/profile')).data.fullName).toBe('Người Thật')
  })

  it('post_ChangePasswordRealBackendUser_IsAcceptedWithoutTouchingRealAccount', async () => {
    expect((await changePassword({ currentPassword: 'BatKyMatKhau#1' })).status).toBe(204)
  })
})
