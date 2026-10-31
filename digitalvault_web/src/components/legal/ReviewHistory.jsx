import { History } from 'lucide-react'
import { verificationStatusInfo } from '../../utils/handover'
import { formatDateTime } from '../../utils/proofOfLife'

const BADGE_CLASS = { ok: 'av-badge-ok', info: 'av-badge-info', warn: 'av-badge-warn', muted: 'av-badge-muted' }

// Lịch sử các lần thẩm định của một hồ sơ (mới nhất trước): người thẩm định, kết quả, ý kiến và thời gian
export default function ReviewHistory({ entries = [] }) {
  return (
    <section className="av-panel d-flex flex-column gap-3" aria-label="Lịch sử thẩm định">
      <h2 className="mb-0 fw-bold text-ink fs-15 d-flex align-items-center gap-2">
        <History size={18} className="text-brand" aria-hidden="true" />
        {`Lịch sử thẩm định (${entries.length})`}
      </h2>

      {entries.length === 0 ? (
        <p className="av-empty mb-0 fs-13 text-slate-500 py-3">Hồ sơ này chưa có lần thẩm định nào.</p>
      ) : (
        <ol className="list-unstyled mb-0 d-flex flex-column gap-3">
          {entries.map((entry) => {
            const info = verificationStatusInfo(entry.status)
            return (
              <li key={entry.verificationId} className="border-start border-2 ps-3" style={{ borderColor: 'var(--av-primary-line)' }}>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span className={`av-badge ${BADGE_CLASS[info.tone]}`}>{info.text}</span>
                  <span className="fs-13 fw-semibold text-ink">{entry.verifierName ?? `Người xác minh #${entry.verifierId}`}</span>
                </div>
                <p className="mb-0 mt-1 fs-12 text-slate-500">
                  {`Gửi thẩm định lúc ${formatDateTime(entry.submittedAt)}`}
                  {' · '}
                  {entry.reviewedAt ? `Thẩm định lúc ${formatDateTime(entry.reviewedAt)}` : 'Chưa có kết quả'}
                </p>
                {entry.comment && <p className="mb-0 mt-2 p-2 rounded bg-light fs-13 text-slate-600">{entry.comment}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
