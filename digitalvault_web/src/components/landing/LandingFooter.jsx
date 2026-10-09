// Chân trang landing page
export default function LandingFooter() {
  return (
    <footer className="av-footer">
      <div className="av-container d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-md-between py-3 fs-12 text-slate-500">
        <p className="mb-0">
          © 2026 <span className="fw-semibold text-ink">AeternaVault</span>. Nền tảng quản lý &amp; ủy thác di sản số
          an toàn theo tiêu chuẩn mật mã học E2EE.
        </p>
        <div className="d-flex flex-wrap align-items-center column-gap-3 row-gap-1">
          <span className="font-mono fs-11">AES-256-GCM</span>
          <span aria-hidden="true">•</span>
          <span className="font-mono fs-11">SmartCA Compliant</span>
          <span aria-hidden="true">•</span>
          <a href="#">Chính sách bảo mật</a>
          <span aria-hidden="true">•</span>
          <a href="#">Điều khoản sử dụng</a>
        </div>
      </div>
    </footer>
  )
}
