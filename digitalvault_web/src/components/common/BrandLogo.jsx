import { LockKeyhole } from 'lucide-react'

// Logo AeternaVault: ô vuông teal + tên thương hiệu + dòng phụ dạng mono
export default function BrandLogo({ subtitle = 'DIGITAL INHERITANCE PLATFORM' }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
        <LockKeyhole className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-tight text-ink">AeternaVault</span>
        <span className="mt-1 font-mono text-[9px] font-medium tracking-[0.14em] text-primary">{subtitle}</span>
      </span>
    </div>
  )
}
