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

// Tiền tố URL của từng cổng, dùng để biết người dùng đang ở cổng nào
const PORTAL_PREFIXES = {
  Admin: '/admin',
  LegalVerifier: '/verifier',
  Executor: '/executor',
  Owner: '/owner',
  Beneficiary: '/beneficiary',
}

const PORTAL_LABELS = {
  Admin: 'Quản trị hệ thống',
  LegalVerifier: 'Thẩm định pháp lý',
  Executor: 'Người thi hành',
  Owner: 'Chủ sở hữu kho',
  Beneficiary: 'Người thụ hưởng',
}

/**
 * Trả về route mặc định theo vai trò: ưu tiên cổng người dùng đã chọn (nếu họ có vai trò đó), không thì theo độ ưu tiên
 * @param {string[]} roles
 * @param {string | null} [preferredRole]
 * @returns {string | null}
 */
export function getDefaultRouteForRoles(roles = [], preferredRole = null) {
  if (!Array.isArray(roles) || roles.length === 0) return null
  if (preferredRole && roles.includes(preferredRole) && ROLE_ROUTE_MAP[preferredRole]) return ROLE_ROUTE_MAP[preferredRole]

  for (const role of ROLE_PRIORITY_ORDER) {
    if (roles.includes(role)) {
      return ROLE_ROUTE_MAP[role]
    }
  }

  return null
}

// Các cổng người dùng được vào (theo độ ưu tiên) kèm tên hiển thị và route đích
export function getPortals(roles = []) {
  if (!Array.isArray(roles)) return []
  return ROLE_PRIORITY_ORDER.filter((role) => roles.includes(role)).map((role) => ({
    role,
    label: PORTAL_LABELS[role],
    to: ROLE_ROUTE_MAP[role],
  }))
}

// Cổng ứng với đường dẫn hiện tại, null nếu không thuộc cổng nào
export function portalRoleOfPath(pathname = '') {
  return ROLE_PRIORITY_ORDER.find((role) => pathname === PORTAL_PREFIXES[role] || pathname.startsWith(`${PORTAL_PREFIXES[role]}/`)) ?? null
}
