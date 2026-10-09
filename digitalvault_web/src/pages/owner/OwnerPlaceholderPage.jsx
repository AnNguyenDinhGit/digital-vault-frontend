// Trang tạm cho khu vực Owner, nội dung thật làm ở bước 6 và 7
export default function OwnerPlaceholderPage({ title }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-[20px] font-bold text-ink">{title}</h1>
      <p className="mt-2 text-[13px] text-slate-500">Màn hình này đang được phát triển.</p>
    </section>
  )
}
