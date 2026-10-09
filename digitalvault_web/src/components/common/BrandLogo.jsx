import { LockKeyhole } from 'lucide-react'

// Logo AeternaVault: ô vuông teal + tên thương hiệu + dòng phụ dạng mono
export default function BrandLogo({ subtitle = 'DIGITAL INHERITANCE PLATFORM' }) {
  return (
    <div className="d-flex align-items-center gap-3">
      <span className="av-logo-mark">
        <LockKeyhole size={20} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="d-flex flex-column lh-1">
        <span className="av-brand-name">AeternaVault</span>
        <span className="av-brand-sub">{subtitle}</span>
      </span>
    </div>
  )
}
