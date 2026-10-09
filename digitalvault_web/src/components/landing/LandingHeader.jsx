import { LogIn } from 'lucide-react'
import BrandLogo from '../common/BrandLogo'

const NAV_ITEMS = ['Giới thiệu', 'Chuẩn bảo mật E2EE', 'Quy trình di chúc số', 'Pháp lý & SmartCA']

// Thanh điều hướng trên cùng của landing page
export default function LandingHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-8">
        <BrandLogo />
        <nav aria-label="Điều hướng chính" className="hidden items-center gap-9 md:flex">
          {NAV_ITEMS.map((item) => (
            <a key={item} href="#" className="text-[13px] font-medium text-slate-600 transition-colors hover:text-primary">
              {item}
            </a>
          ))}
        </nav>
        <a
          href="#login"
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Cổng Truy Cập
        </a>
      </div>
    </header>
  )
}
