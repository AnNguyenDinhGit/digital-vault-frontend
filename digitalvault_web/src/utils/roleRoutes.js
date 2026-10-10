// Ánh xạ vai trò (Role) từ DB sang route mặc định tương ứng
export const ROLE_ROUTE_MAP = {
  Admin: '/admin',
  LegalVerifier: '/verifier',
  Executor: '/executor',
  Owner: '/owner/assets',
  Beneficiary: '/beneficiary',
}

// Danh sách độ ưu tiên khi người dùng có nhiều vai trò
export const ROLE_PRIORITY_ORDER = [
  'Admin',
  'LegalVerifier',
  'Executor',
  'Owner',
  'Beneficiary',
]

/**
 * Trả về route tương ứng theo vai trò ưu tiên của người dùng
 * @param {string[]} roles
 * @returns {string | null}
 */
export function getDefaultRouteForRoles(roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return null

  for (const role of ROLE_PRIORITY_ORDER) {
    if (roles.includes(role)) {
      return ROLE_ROUTE_MAP[role]
    }
  }

  return null
}
