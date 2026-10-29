import { handoverStatusInfo } from '../../utils/handover'

const BADGE_CLASS = { ok: 'av-badge-ok', warn: 'av-badge-warn', info: 'av-badge-info', muted: 'av-badge-muted' }

// Nhãn trạng thái hồ sơ bàn giao với màu theo ý nghĩa
export default function HandoverStatusBadge({ status }) {
  const info = handoverStatusInfo(status)
  return <span className={`av-badge ${BADGE_CLASS[info.tone]}`}>{info.text}</span>
}
