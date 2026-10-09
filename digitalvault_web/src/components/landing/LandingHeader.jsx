import { LogIn } from 'lucide-react'
import BrandLogo from '../common/BrandLogo'

const NAV_ITEMS = ['Giới thiệu', 'Chuẩn bảo mật E2EE', 'Quy trình di chúc số', 'Pháp lý & SmartCA']

// Thanh điều hướng trên cùng của landing page
export default function LandingHeader() {
  return (
    <header className="av-header">
      <div className="av-container av-header-inner">
        <BrandLogo />
        <nav aria-label="Điều hướng chính" className="d-none d-md-flex align-items-center" style={{ gap: 36 }}>
          {NAV_ITEMS.map((item) => (
            <a key={item} href="#" className="av-nav-link">
              {item}
            </a>
          ))}
        </nav>
        <a href="#login" className="btn btn-primary av-btn av-btn-sm">
          <LogIn size={16} aria-hidden="true" />
          Cổng Truy Cập
        </a>
      </div>
    </header>
  )
}
