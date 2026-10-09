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
    <div className="max-w-[680px]">
      <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
        ZERO-KNOWLEDGE ENCRYPTION &amp; LEGAL BINDING
      </span>

      <h1 className="mt-6 text-[36px] font-extrabold leading-[1.25] tracking-tight text-ink">
        Bảo Vệ &amp; Chuyển Giao
        <br />
        <span className="whitespace-nowrap"><span className="text-primary">Di Sản Kỹ Thuật Số</span> An Toàn Tuyệt Đối</span>
      </h1>

      <p className="mt-5 text-[14px] leading-relaxed text-slate-500">
        Nền tảng ủy thác và phân quyền thừa kế tài sản số có giá trị pháp lý đầu tiên. Tự động chuyển giao quyền truy
        cập ví crypto, tài khoản tài chính và tài liệu nhạy cảm thông qua cơ chế Dead Man's Switch và chữ ký số.
      </p>

      <ul className="mt-8 space-y-5">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-white text-primary">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-bold text-ink">{title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
