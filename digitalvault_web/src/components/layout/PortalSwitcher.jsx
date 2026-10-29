import { ArrowLeftRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { setPortalPreference } from '../../utils/portalPreference'
import { getPortals, portalRoleOfPath } from '../../utils/roleRoutes'

// Chuyển giữa các cổng khi tài khoản có từ 2 vai trò trở lên (vd vừa là chủ kho vừa là người thụ hưởng); ẩn nếu chỉ có một
export default function PortalSwitcher() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const portals = getPortals(user?.roles)
  if (portals.length < 2) return null

  const currentRole = portalRoleOfPath(pathname)

  const handleSwitch = (portal) => {
    setPortalPreference(portal.role)
    navigate(portal.to)
  }

  return (
    <nav aria-label="Chuyển cổng" className="av-info-box d-flex flex-column gap-1" style={{ padding: 12 }}>
      <p className="d-flex align-items-center gap-2 mb-1 fs-12 fw-semibold text-brand">
        <ArrowLeftRight size={14} aria-hidden="true" />
        Chuyển cổng
      </p>
      {portals.map((portal) => (
        <button
          key={portal.role}
          type="button"
          className="av-ghost-btn text-start"
          aria-current={portal.role === currentRole ? 'page' : undefined}
          disabled={portal.role === currentRole}
          onClick={() => handleSwitch(portal)}
        >
          {portal.role === currentRole ? `${portal.label} (đang dùng)` : portal.label}
        </button>
      ))}
    </nav>
  )
}
