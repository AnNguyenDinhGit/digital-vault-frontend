// Trang khung giữ chỗ theo giao diện panel đồng nhất cho các role
export default function RolePlaceholderPage({ title, description = 'Màn hình này đang được phát triển.' }) {
  return (
    <section className="av-panel">
      <h1 className="mb-0 fw-bold text-ink" style={{ fontSize: 20 }}>{title}</h1>
      <p className="mt-2 mb-0 fs-13 text-slate-500">{description}</p>
    </section>
  )
}
