import { Link } from 'react-router-dom'
import { formatDateTime } from '../../utils/proofOfLife'
import HandoverStatusBadge from './HandoverStatusBadge'

// Bảng hồ sơ bàn giao của Executor; mỗi dòng dẫn tới trang chi tiết
export default function HandoverTable({ handovers }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0 fs-13" aria-label="Danh sách hồ sơ bàn giao">
        <thead>
          <tr className="fs-11 text-slate-500">
            <th scope="col">Mã hồ sơ</th>
            <th scope="col">Kho</th>
            <th scope="col">Ngày tạo</th>
            <th scope="col">Phạm vi</th>
            <th scope="col">Giấy tờ</th>
            <th scope="col">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {handovers.map((item) => (
            <tr key={item.requestId}>
              <td>
                <Link to={`/executor/handovers/${item.requestId}`} className="fw-semibold text-decoration-none">
                  {`Hồ sơ #${item.requestId}`}
                </Link>
              </td>
              <td>{`Kho #${item.vaultId}`}</td>
              <td className="text-nowrap">{formatDateTime(item.initiatedAt)}</td>
              <td>{`${new Set(item.cases.map((entry) => entry.assetId)).size} tài sản`}</td>
              <td>{`${item.documents.length} giấy tờ`}</td>
              <td>
                <HandoverStatusBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
