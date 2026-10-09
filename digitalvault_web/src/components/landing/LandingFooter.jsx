// Chân trang landing page
export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-8 py-5 text-[12px] text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>
          © 2026 <span className="font-semibold text-ink">AeternaVault</span>. Nền tảng quản lý &amp; ủy thác di sản số
          an toàn theo tiêu chuẩn mật mã học E2EE.
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[11px]">AES-256-GCM</span>
          <span aria-hidden="true">•</span>
          <span className="font-mono text-[11px]">SmartCA Compliant</span>
          <span aria-hidden="true">•</span>
          <a href="#" className="hover:text-primary">
            Chính sách bảo mật
          </a>
          <span aria-hidden="true">•</span>
          <a href="#" className="hover:text-primary">
            Điều khoản sử dụng
          </a>
        </div>
      </div>
    </footer>
  )
}
