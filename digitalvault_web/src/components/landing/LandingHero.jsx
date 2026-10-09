import { Activity, LockKeyhole, UserCheck } from 'lucide-react'

const FEATURES = [
  {
    icon: LockKeyhole,
    title: 'Mã hóa đầu cuối (E2EE Client-Side)',
    description:
      'Dữ liệu tài sản được mã hóa AES-256 ngay trên thiết bị của bạn trước khi đưa lên đám mây. Không ai, kể cả quản trị viên, có thể đọc trộm.',
  },
  {
    icon: Activity,
    title: "Cơ chế điểm danh sự sống (Dead Man's Switch)",
    description:
      'Hệ thống định kỳ gửi tín hiệu kiểm tra an toàn. Quy trình bàn giao chỉ được kích hoạt nếu bạn không còn khả năng phản hồi sau thời gian gia hạn.',
  },
  {
    icon: UserCheck,
    title: 'Xác thực tư pháp & Chữ ký số SmartCA',
    description:
      'Bàn giao di sản có sự tham gia của Digital Executor (luật sư/công chứng viên) và Legal Verifier với giấy chứng tử hợp pháp.',
  },
]

// Khối giới thiệu bên trái landing page
export default function LandingHero() {
  return (
    <div style={{ maxWidth: 680 }}>
      <span className="av-pill">
        <span className="av-pill-dot" aria-hidden="true" />
        ZERO-KNOWLEDGE ENCRYPTION &amp; LEGAL BINDING
      </span>

      <h1 className="av-hero-title text-ink">
        Bảo Vệ &amp; Chuyển Giao
        <br />
        <span className="text-nowrap">
          <span className="text-brand">Di Sản Kỹ Thuật Số</span> An Toàn Tuyệt Đối
        </span>
      </h1>

      <p className="mt-4 mb-0 fs-14 text-slate-500" style={{ lineHeight: 1.65 }}>
        Nền tảng ủy thác và phân quyền thừa kế tài sản số có giá trị pháp lý đầu tiên. Tự động chuyển giao quyền truy
        cập ví crypto, tài khoản tài chính và tài liệu nhạy cảm thông qua cơ chế Dead Man's Switch và chữ ký số.
      </p>

      <ul className="list-unstyled mt-4 mb-0 d-flex flex-column gap-4 pt-2">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <li key={title} className="d-flex gap-3">
            <span className="av-feature-icon">
              <Icon size={16} aria-hidden="true" />
            </span>
            <div>
              <p className="mb-0 fs-13 fw-bold text-ink">{title}</p>
              <p className="mt-1 mb-0 fs-12 text-slate-500" style={{ lineHeight: 1.6 }}>
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
