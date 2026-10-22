import { caseStatusInfo } from '../../utils/beneficiary'

// Nhãn trạng thái của một phần bàn giao (CaseDto.status)
export default function CaseStatusBadge({ status }) {
  const { text, tone } = caseStatusInfo(status)
  return <span className={`av-badge av-badge-${tone}`}>{text}</span>
}
