import { Check } from 'lucide-react'
import { HANDOVER_STEPS, handoverStepIndex } from '../../utils/beneficiary'

// Thanh tiến trình bàn giao 4 bước; compact dùng trong danh sách, đầy đủ thì kèm mô tả từng bước
export default function HandoverStepper({ status, compact = false }) {
  const current = handoverStepIndex(status)
  return (
    <ol className={`av-stepper${compact ? ' is-compact' : ''}`} aria-label="Tiến trình bàn giao">
      {HANDOVER_STEPS.map((step, index) => {
        const done = current >= 0 && (index < current || (index === current && step.key === 'Received'))
        const active = index === current && !done
        const state = done ? 'is-done' : active ? 'is-current' : ''
        return (
          <li key={step.key} className={`av-step ${state}`} aria-current={active ? 'step' : undefined}>
            <span className="av-step-dot">{done ? <Check size={compact ? 10 : 14} aria-hidden="true" /> : index + 1}</span>
            <span className="av-step-text">
              <span className="av-step-label">{step.label}</span>
              {!compact && <span className="av-step-desc">{step.description}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
