import { CreditCard, RefreshCw } from 'lucide-react'
import { Button } from 'react-bootstrap'
import { getPlans } from '../../callapi/paymentApi'
import AdminResourceState from '../../components/admin/AdminResourceState'
import MockNotice from '../../components/common/MockNotice'
import { useAdminResource } from '../../hooks/useAdminResource'
import { MOCK_MODE } from '../../mocks/mode'
import { formatDuration, formatStorage, formatVnd } from '../../utils/payment'

// Trang "Gói dịch vụ & thanh toán" của Admin: chỉ xem danh mục gói đang bán vì BE chưa có API giao dịch hay sửa gói
export default function AdminPlansPage({ mockMode = MOCK_MODE }) {
  const { data: plans, error, loading, reload } = useAdminResource(getPlans)

  return (
    <div className="d-flex flex-column gap-4">
      <section className="av-panel av-banner">
        <div className="d-flex align-items-center gap-3">
          <span className="av-icon-tile">
            <CreditCard size={20} aria-hidden="true" />
          </span>
          <div>
            <h1 className="mb-1 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              Gói dịch vụ &amp; thanh toán
            </h1>
            <p className="mb-0 fs-12 text-slate-500">Danh mục các gói đang bán cho Owner qua cổng VNPay.</p>
          </div>
        </div>
        <Button type="button" variant="light" className="av-btn av-btn-sm border" disabled={loading} onClick={reload}>
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </Button>
      </section>

      <MockNotice mode={mockMode === 'full' ? mockMode : 'off'} />

      <section className="av-panel d-flex flex-column gap-3" aria-label="Gói dịch vụ đang bán">
        <p className="mb-0 fs-12 text-slate-500">Hệ thống hiện chưa có API xem giao dịch, doanh thu hay chỉnh sửa gói, nên trang này chỉ hiển thị danh mục gói (chỉ đọc).</p>

        <AdminResourceState error={error} loading={loading} hasData={Boolean(plans)} loadingText="Đang tải danh mục gói dịch vụ..." onRetry={reload} />

        {plans && plans.length === 0 && <p className="av-empty mb-0">Chưa có gói dịch vụ nào đang bán.</p>}

        {plans && plans.length > 0 && (
          <div className="table-responsive" aria-busy={loading}>
            <table className="table align-middle mb-0 fs-13" aria-label="Danh mục gói dịch vụ">
              <thead>
                <tr className="fs-11 text-slate-500">
                  <th scope="col">Gói</th>
                  <th scope="col">Số kho tối đa</th>
                  <th scope="col">Dung lượng tối đa</th>
                  <th scope="col">Giá</th>
                  <th scope="col">Thời hạn</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.planId}>
                    <td className="fw-semibold text-ink">{plan.planName}</td>
                    <td>{`${plan.maxVaults} kho`}</td>
                    <td>{formatStorage(plan.maxStorageBytes)}</td>
                    <td className="text-nowrap">{formatVnd(plan.price)}</td>
                    <td className="text-nowrap">{formatDuration(plan.durationDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
