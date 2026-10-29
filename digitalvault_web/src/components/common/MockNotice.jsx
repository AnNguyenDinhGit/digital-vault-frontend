import { FlaskConical } from 'lucide-react'
import { MOCK_MODE } from '../../mocks/mode'

const DEFAULT_MESSAGE = 'Dữ liệu mô phỏng: tính năng này chưa có API trên máy chủ nên dữ liệu chưa được lưu thật.'

// Nhãn báo trang đang dùng dữ liệu mô phỏng; không hiện khi chạy không mock
export default function MockNotice({ mode = MOCK_MODE, message = DEFAULT_MESSAGE }) {
  if (mode === 'off') return null
  return (
    <p role="note" className="av-mock-notice">
      <FlaskConical size={14} aria-hidden="true" />
      {message}
    </p>
  )
}
