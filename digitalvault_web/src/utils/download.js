// Lưu một Blob về máy dưới tên filename (dùng cho tải giấy tờ)
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

// Tải một chuỗi văn bản về máy dưới dạng file (dùng cho xuất CSV)
export function downloadTextFile(filename, text, mime = 'text/plain;charset=utf-8') {
  downloadBlob(filename, new Blob([text], { type: mime }))
}
