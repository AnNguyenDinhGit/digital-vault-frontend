import { CheckCircle2, CreditCard, HardDrive, RefreshCw, Vault } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, Button } from 'react-bootstrap'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getMySubscription, getPlans } from '../../callapi/paymentApi'
import AdminResourceState from '../../components/admin/AdminResourceState'
import MockNotice from '../../components/common/MockNotice'
import CurrentSubscriptionPanel from '../../components/payment/CurrentSubscriptionPanel'
import PaymentHistoryPanel from '../../components/payment/PaymentHistoryPanel'
import { useAdminResource } from '../../hooks/useAdminResource'
import { MOCK_MODE } from '../../mocks/mode'
import { formatDuration, formatPlanPrice, formatStorage, planAction } from '../../utils/payment'

// Thẻ một gói: giá, thời hạn, giới hạn và nút Mua / Nâng cấp / Gia hạn sang màn hình thanh toán
function PlanCard({ plan, currentPlan }) {
  const isCurrent = Boolean(currentPlan) && currentPlan.planId === plan.planId
  const action = planAction(plan, currentPlan)
  return (
    <article
      className="av-panel d-flex flex-column gap-3 h-100"
      aria-label={plan.planName}
      style={isCurrent ? { borderColor: 'var(--bs-primary)', boxShadow: '0 0 0 1px var(--bs-primary)' } : undefined}
    >
      <div>
        <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
          <h2 className="mb-0 fw-bold text-ink" style={{ fontSize: 18 }}>
            {plan.planName}
          </h2>
          {isCurrent && (
            <span className="av-badge av-badge-ok d-inline-flex align-items-center gap-1">
              <CheckCircle2 size={12} aria-hidden="true" />
              Đang dùng
            </span>
          )}
        </div>
        <p className="mb-0">
          <span className="av-stat-value">{formatPlanPrice(plan)}</span>
          <span className="av-stat-unit">{`/ ${formatDuration(plan.durationDays)}`}</span>
        </p>
      </div>
      <ul className="list-unstyled mb-0 d-flex flex-column gap-2 fs-13 text-slate-600 flex-grow-1">
        <li className="d-flex align-items-center gap-2">
          <Vault size={14} aria-hidden="true" className="text-brand" />
          {`Tối đa ${plan.maxVaults} kho`}
        </li>
        <li className="d-flex align-items-center gap-2">
          <HardDrive size={14} aria-hidden="true" className="text-brand" />
          {`Dung lượng ${formatStorage(plan.maxStorageBytes)}`}
        </li>
      </ul>
      {action ? (
        <Button as={Link} to={`/owner/plans/${plan.planId}/checkout`} variant={action.primary ? 'primary' : 'light'} className={`av-btn av-btn-md${action.primary ? '' : ' border'}`}>
          {action.label}
        </Button>
      ) : (
        <Button type="button" variant="light" className="av-btn av-btn-md border" disabled>
          Đang sử dụng
        </Button>
      )}
    </article>
  )
}

// Trang "Gói dịch vụ" của Owner: gói đang dùng, danh mục gói để chọn sang màn hình thanh toán, và lịch sử thanh toán
export default function OwnerPlansPage({ mockMode = MOCK_MODE }) {
  const location = useLocation()
  const navigate = useNavigate()
  // Thông báo do trang thanh toán gửi sang (vd gói 0đ được BE kích hoạt ngay, không qua VNPay)
  const [notice, setNotice] = useState(() => location.state?.notice ?? '')
  const { data: plans, error, loading, reload } = useAdminResource(getPlans)
  const subscription = useAdminResource(getMySubscription)
  const currentPlan = subscription.data?.hasActiveSubscription ? (subscription.data.subscription?.plan ?? null) : null

  // Xoá state khỏi lịch sử để F5 không hiện lại thông báo cũ
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  const refresh = () => {
    reload()
    subscription.reload()
  }

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <CreditCard size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Gói dịch vụ
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Chọn gói phù hợp và thanh toán an toàn qua cổng VNPay. Sau khi thanh toán thành công, gói mới có hiệu lực và gói đang dùng sẽ hết hạn.</p>
          </div>
        </div>
        <Button type="button" variant="light" className="av-btn av-btn-sm border" disabled={loading} onClick={refresh}>
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </Button>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      {notice && (
        <Alert variant="success" className="av-alert mb-0" dismissible onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <CurrentSubscriptionPanel data={subscription.data} error={subscription.error} loading={subscription.loading} onRetry={subscription.reload} />

      <AdminResourceState error={error} loading={loading} hasData={Boolean(plans)} loadingText="Đang tải các gói dịch vụ..." onRetry={reload} />

      {plans && plans.length === 0 && <p className="av-empty mb-0">Hiện chưa có gói dịch vụ nào đang bán.</p>}

      {plans && plans.length > 0 && (
        <div className="row g-3">
          {plans.map((plan) => (
            <div key={plan.planId} className="col-12 col-md-6 col-xl-4">
              <PlanCard plan={plan} currentPlan={currentPlan} />
            </div>
          ))}
        </div>
      )}

      <PaymentHistoryPanel />
    </div>
  )
}
