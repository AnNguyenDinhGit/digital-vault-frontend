describe('mock db persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('load_StoredStateWithOldVersion_IsDiscardedAndReseeded', async () => {
    // Dữ liệu cũ (chưa có tài khoản các role mới) còn lưu trong trình duyệt của người dùng
    localStorage.setItem(
      'aeterna.mock.db',
      JSON.stringify({ users: [{ userId: 1, email: 'owner@example.com', roles: ['Owner'] }], vaults: [], assets: [], assignments: [] }),
    )
    const { getDb, ROLE_ACCOUNTS } = await import('./db')
    const emails = getDb().users.map((u) => u.email)
    ROLE_ACCOUNTS.forEach((account) => expect(emails).toContain(account.email))
  })

  it('load_StoredStateWithCurrentVersion_IsKept', async () => {
    const first = await import('./db')
    first.getDb().vaults.push({ vaultId: 99, ownerId: 1, name: 'Kho đã lưu', description: null, status: 'Active' })
    first.saveDb()

    vi.resetModules()
    const second = await import('./db')
    expect(second.getDb().vaults.map((v) => v.vaultId)).toContain(99)
  })
})
