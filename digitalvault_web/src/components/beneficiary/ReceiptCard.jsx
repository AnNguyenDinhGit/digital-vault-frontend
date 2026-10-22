import { BadgeCheck, Download, FileSignature } from 'lucide-react'
import { downloadTextFile } from '../../utils/download'
import { formatDateTime } from '../../utils/proofOfLife'
import { receiptText } from '../../utils/beneficiary'

const RECEIPT_STATUS_LABELS = { Confirmed: 'Đã xác nhận', Received: 'Đã nhận', Signed: 'Đã ký số' }

// Thẻ biên nhận số (ReceiptDto) có nút tải bản văn bản
export default function ReceiptCard({ receipt, assetName }) {
  const statusText = RECEIPT_STATUS_LABELS[receipt.status] ?? receipt.status ?? 'Đã xác nhận'
  return (
    <article className="av-receipt" aria-label={`Biên nhận số #${receipt.receiptId}`}>
      <div className="av-receipt-head">
        <span className="av-receipt-seal">
          <BadgeCheck size={22} aria-hidden="true" />
        </span>
        <div style={{ minWidth: 0 }}>
          <p className="mb-0 av-mono-tag fs-10">DIGITAL RECEIPT</p>
          <p className="mb-0 fw-bold text-ink fs-14">{`Biên nhận số #${receipt.receiptId}`}</p>
        </div>
        <span className="av-badge av-badge-ok ms-auto">{statusText}</span>
      </div>
      <dl className="av-meta-grid mb-0">
        <div>
          <dt>Hồ sơ bàn giao</dt>
          <dd className="font-mono">{`#${receipt.handoverId}`}</dd>
        </div>
        <div>
          <dt>Thời điểm xác nhận</dt>
          <dd>{receipt.confirmedAt ? formatDateTime(receipt.confirmedAt) : '—'}</dd>
        </div>
        {assetName && (
          <div className="av-meta-wide">
            <dt>Tài sản</dt>
            <dd>{assetName}</dd>
          </div>
        )}
        <div className="av-meta-wide">
          <dt>Ghi chú</dt>
          <dd style={{ whiteSpace: 'pre-line' }}>{receipt.note || '—'}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="av-ghost-btn align-self-start"
        id={`download-receipt-${receipt.receiptId}`}
        onClick={() => downloadTextFile(`bien-nhan-${receipt.receiptId}.txt`, receiptText(receipt, assetName))}
      >
        <Download size={14} aria-hidden="true" />
        Tải biên nhận
      </button>
      <span className="av-receipt-watermark" aria-hidden="true">
        <FileSignature size={80} />
      </span>
    </article>
  )
}
