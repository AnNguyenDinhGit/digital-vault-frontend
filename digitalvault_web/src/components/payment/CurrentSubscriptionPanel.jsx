import { CalendarClock, HardDrive, ShieldCheck, Vault } from 'lucide-react'
import AdminResourceState from '../admin/AdminResourceState'
import { daysLeft, formatPaymentDate, formatStorage, subscriptionStatusInfo, usedPercent } from '../../utils/payment'

// Khung "Gói đang sử dụng" (GET /payments/me/subscription): tên gói, thời hạn còn lại và giới hạn của gói
export default function CurrentSubscriptionPanel({ data, error, loading, onRetry }) {
  const subscription = data?.hasActiveSubscription ? data.subscription : null
  const plan = subscription?.plan

  return (
    <section className="av-panel d-flex flex-column gap-3" aria-labelledby="current-plan-title">
      <h2 id="current-plan-title" className="mb-0 fw-bold text-ink" style={{ fontSize: 16 }}>
        Gói đang sử dụng
      </h2>

      <AdminResourceState error={error} loading={loading} hasData={Boolean(data)} loadingText="Đang tải gói hiện tại..." onRetry={onRetry} />

      {data && !subscription && (
        <p className="mb-0 fs-13 text-slate-500">
          Bạn chưa có gói trả phí nào đang hiệu lực. Hãy chọn một gói bên dưới để mở rộng số kho và dung lượng lưu trữ.
        </p>
      )}

      {subscription && (
        <div className="d-flex flex-column gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <ShieldCheck size={18} aria-hidden="true" className="text-brand" />
            <span className="fw-bold text-ink" style={{ fontSize: 16 }}>{plan?.planName ?? 'Gói dịch vụ'}</span>
            <span className={`av-badge av-badge-${subscriptionStatusInfo(subscription.status).tone}`}>{subscriptionStatusInfo(subscription.status).text}</span>
          </div>

          <div>
            <div className="d-flex justify-content-between fs-12 text-slate-500 mb-1">
              <span>{`Từ ${formatPaymentDate(subscription.startDate)}`}</span>
              <span>{`Hết hạn ${formatPaymentDate(subscription.endDate)}`}</span>
            </div>
            <div
              className="progress"
              style={{ height: 6 }}
              role="progressbar"
              aria-label="Thời hạn gói đã sử dụng"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={usedPercent(subscription.startDate, subscription.endDate)}
            >
              <div className="progress-bar" style={{ width: `${usedPercent(subscription.startDate, subscription.endDate)}%` }} />
            </div>
          </div>

          <ul className="list-unstyled mb-0 d-flex flex-wrap gap-4 fs-13 text-slate-600">
            <li className="d-flex align-items-center gap-2">
              <CalendarClock size={14} aria-hidden="true" className="text-brand" />
              {`Còn ${daysLeft(subscription.endDate)} ngày`}
            </li>
            {plan && (
              <>
                <li className="d-flex align-items-center gap-2">
                  <Vault size={14} aria-hidden="true" className="text-brand" />
                  {`Tối đa ${plan.maxVaults} kho`}
                </li>
                <li className="d-flex align-items-center gap-2">
                  <HardDrive size={14} aria-hidden="true" className="text-brand" />
                  {`Dung lượng ${formatStorage(plan.maxStorageBytes)}`}
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </section>
  )
}
