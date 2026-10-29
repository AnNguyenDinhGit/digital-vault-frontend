import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmVnpayReturn } from '../../callapi/paymentApi'
import AdminResourceState from '../../components/admin/AdminResourceState'
import BrandLogo from '../../components/common/BrandLogo'
import { useAdminResource } from '../../hooks/useAdminResource'
import { formatVnd, returnErrorMessage, vnpayParams } from '../../utils/payment'

// Nội dung hiển thị theo trạng thái giao dịch BE xác nhận (không tin tham số trên địa chỉ trang)
const OUTCOME = {
  Success: { icon: CheckCircle2, color: 'text-brand', title: 'Thanh toán thành công', note: 'Gói dịch vụ mới đã được kích hoạt. Gói đang dùng trước đó (nếu có) sẽ hết hạn.' },
  Failed: { icon: XCircle, color: 'text-danger', title: 'Thanh toán thất bại', note: 'Giao dịch không thành công hoặc đã bị hủy. Tài khoản của bạn không bị trừ tiền cho giao dịch này.' },
  Pending: { icon: Clock, color: 'text-slate-500', title: 'Đang chờ xác nhận', note: 'Hệ thống đang chờ VNPay xác nhận giao dịch. Bạn có thể tải lại trang sau ít phút.' },
}

function ResultShell({ children }) {
  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center p-4">
      <section className="av-panel d-flex flex-column gap-4 w-100" style={{ maxWidth: 520 }}>
        <BrandLogo />
        {children}
      </section>
    </main>
  )
}

// Trang công khai VNPay đưa khách về sau khi thanh toán: chuyển nguyên tham số vnp_* cho BE kiểm tra chữ ký rồi hiện kết quả
export default function VnpayReturnPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.toString()
  const params = useMemo(() => vnpayParams(new URLSearchParams(query)), [query])
  const hasParams = Object.keys(params).length > 0
  // Không có tham số VNPay thì không gọi BE
  const fetcher = useMemo(() => () => (hasParams ? confirmVnpayReturn(params) : Promise.resolve(null)), [hasParams, params])
  const { data, error, errorStatus, loading, reload } = useAdminResource(fetcher)

  if (error || (loading && !data)) {
    // Mã trạng thái của BE quyết định thông báo (400 chữ ký sai, 404 không có giao dịch, 409 kết quả mâu thuẫn...)
    const message = error ? returnErrorMessage({ status: errorStatus, message: error }) : ''
    return (
      <ResultShell>
        <AdminResourceState error={message} loading={loading} hasData={false} loadingText="Đang xác thực kết quả thanh toán..." onRetry={reload} />
      </ResultShell>
    )
  }

  if (!data) {
    return (
      <ResultShell>
        <h1 className="mb-0 fw-bold text-ink" style={{ fontSize: 20 }}>
          Không có thông tin thanh toán
        </h1>
        <p className="mb-0 fs-13 text-slate-500">Địa chỉ này không chứa kết quả thanh toán từ VNPay. Hãy chọn gói dịch vụ và thanh toán lại.</p>
        <Links />
      </ResultShell>
    )
  }

  const outcome = OUTCOME[data.status] ?? OUTCOME.Pending
  const Icon = outcome.icon
  return (
    <ResultShell>
      <div className="d-flex flex-column align-items-center gap-2 text-center">
        <Icon size={48} aria-hidden="true" className={outcome.color} />
        <h1 className="mb-0 fw-bold text-ink" style={{ fontSize: 22 }}>
          {outcome.title}
        </h1>
        <p className="mb-0 fs-13 text-slate-500">{outcome.note}</p>
      </div>
      <dl className="mb-0 d-flex flex-column gap-2 fs-13">
        <div className="d-flex justify-content-between gap-3">
          <dt className="text-slate-500">Mã giao dịch</dt>
          <dd className="mb-0 font-mono text-ink text-break">{data.transactionCode}</dd>
        </div>
        <div className="d-flex justify-content-between gap-3">
          <dt className="text-slate-500">Số tiền</dt>
          <dd className="mb-0 fw-semibold text-ink">{formatVnd(data.amount)}</dd>
        </div>
      </dl>
      <Links />
    </ResultShell>
  )
}

function Links() {
  return (
    <div className="d-flex flex-wrap justify-content-center gap-3 fs-13">
      <Link to="/owner/plans">Xem các gói dịch vụ</Link>
      <Link to="/">Về trang chủ</Link>
    </div>
  )
}
