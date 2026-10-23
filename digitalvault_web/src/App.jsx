import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/layout/AdminLayout'
import BeneficiaryLayout from './components/layout/BeneficiaryLayout'
import ExecutorLayout from './components/layout/ExecutorLayout'
import LegalVerifierLayout from './components/layout/LegalVerifierLayout'
import OwnerLayout from './components/layout/OwnerLayout'
import ProtectedRoute from './components/routing/ProtectedRoute'
import { HANDOVER_GROUPS } from './utils/handover'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import RolePlaceholderPage from './pages/common/RolePlaceholderPage'
import AssetCatalogPage from './pages/owner/AssetCatalogPage'
import AssetDetailPage from './pages/owner/AssetDetailPage'
import ActivityLogPage from './pages/owner/ActivityLogPage'
import ExecutorHandoverDetailPage from './pages/executor/ExecutorHandoverDetailPage'
import ExecutorHandoverListPage from './pages/executor/ExecutorHandoverListPage'
import ExecutorOrdersPage from './pages/executor/ExecutorOrdersPage'
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import BeneficiariesPage from './pages/owner/BeneficiariesPage'
import ExecutorManagementPage from './pages/owner/ExecutorManagementPage'
import ExecutorProfilePage from './pages/owner/ExecutorProfilePage'
import OwnerHandoverDetailPage from './pages/owner/OwnerHandoverDetailPage'
import OwnerHandoversPage from './pages/owner/OwnerHandoversPage'
import ProofOfLifePage from './pages/owner/ProofOfLifePage'
import SecuritySettingsPage from './pages/owner/SecuritySettingsPage'
import LegalHandoverListPage from './pages/legal/LegalHandoverListPage'
import LegalHandoverDetailPage from './pages/legal/LegalHandoverDetailPage'

// Component gốc: khai báo provider và các route theo từng vai trò của hệ thống
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* 1. Khu vực Vault Owner */}
          <Route element={<ProtectedRoute role="Owner" />}>
            {/* Chi tiết Executor mở ở cửa sổ mới nên không dùng layout có sidebar */}
            <Route path="/owner/executors/:executorId/view" element={<ExecutorProfilePage />} />
            <Route path="/owner" element={<OwnerLayout />}>
              <Route index element={<Navigate to="assets" replace />} />
              <Route path="assets" element={<AssetCatalogPage />} />
              <Route path="assets/:assetId" element={<AssetDetailPage />} />
              <Route path="beneficiaries" element={<BeneficiariesPage />} />
              <Route path="executor" element={<ExecutorManagementPage />} />
              <Route path="handovers" element={<OwnerHandoversPage />} />
              <Route path="handovers/:requestId" element={<OwnerHandoverDetailPage />} />
              <Route path="proof-of-life" element={<ProofOfLifePage />} />
              <Route path="activity-log" element={<ActivityLogPage />} />
              <Route path="security" element={<SecuritySettingsPage />} />
            </Route>
          </Route>


          {/* 2. Khu vực Người Thi Hành (Executor) */}
          <Route element={<ProtectedRoute role="Executor" />}>
            <Route path="/executor" element={<ExecutorLayout />}>
              <Route index element={<Navigate to="orders" replace />} />
              <Route path="orders" element={<ExecutorOrdersPage />} />
              <Route path="handovers/:requestId" element={<ExecutorHandoverDetailPage />} />
              <Route
                path="pending"
                element={
                  <ExecutorHandoverListPage
                    title="Hồ sơ chờ thẩm định"
                    description="Hồ sơ đã gửi cho người xác minh pháp lý hoặc cần bổ sung tài liệu."
                    statuses={HANDOVER_GROUPS.pending}
                    emptyMessage="Không có hồ sơ nào đang chờ thẩm định."
                  />
                }
              />
              <Route
                path="approved"
                element={
                  <ExecutorHandoverListPage
                    title="Pháp lý đã duyệt - Sẵn sàng bàn giao"
                    description="Hồ sơ đã được người xác minh pháp lý duyệt, có thể bắt đầu bàn giao."
                    statuses={HANDOVER_GROUPS.approved}
                    emptyMessage="Chưa có hồ sơ nào được duyệt pháp lý."
                  />
                }
              />
              <Route
                path="in-progress"
                element={
                  <ExecutorHandoverListPage
                    title="Đang bàn giao & Chờ ký số"
                    description="Hồ sơ đang bàn giao, cần nộp biên bản có chữ ký số để hoàn tất."
                    statuses={HANDOVER_GROUPS.inProgress}
                    emptyMessage="Không có hồ sơ nào đang bàn giao."
                  />
                }
              />
              <Route
                path="history"
                element={
                  <ExecutorHandoverListPage
                    title="Lịch sử bàn giao hoàn tất"
                    description="Hồ sơ đã hoàn tất hoặc đã hủy."
                    statuses={HANDOVER_GROUPS.history}
                    emptyMessage="Chưa có hồ sơ nào hoàn tất."
                  />
                }
              />
              <Route path="mailbox" element={<RolePlaceholderPage title="Hộp thư bảo mật E2EE" />} />
              <Route path="certificates" element={<RolePlaceholderPage title="Chứng thư số & SmartCA" />} />
            </Route>
          </Route>

          {/* 3. Khu vực Thẩm Định Pháp Lý (LegalVerifier / Notary) */}
          <Route element={<ProtectedRoute role="LegalVerifier" />}>
            <Route path="/verifier" element={<LegalVerifierLayout />}>
              <Route index element={<Navigate to="pending" replace />} />
              <Route
                path="pending"
                element={
                  <LegalHandoverListPage
                    title="Hồ sơ chờ thẩm định"
                    description="Xem và thẩm định tính pháp lý của các hồ sơ bàn giao do Người thi hành nộp."
                    status="Pending_Legal"
                    emptyMessage="Hiện không có hồ sơ nào đang chờ thẩm định."
                  />
                }
              />
              <Route
                path="approved"
                element={
                  <LegalHandoverListPage
                    title="Hồ sơ đã duyệt & Ký số"
                    description="Danh sách các hồ sơ bàn giao đã được pháp lý phê duyệt và sẵn sàng bàn giao."
                    status="Approved"
                    emptyMessage="Chưa có hồ sơ nào đã được phê duyệt."
                  />
                }
              />
              <Route
                path="additional-requests"
                element={
                  <LegalHandoverListPage
                    title="Hồ sơ yêu cầu bổ sung"
                    description="Danh sách các hồ sơ đang chờ Người thi hành bổ sung giấy tờ hoặc làm rõ thông tin."
                    status="Additional_Info"
                    emptyMessage="Hiện không có hồ sơ nào đang yêu cầu bổ sung."
                  />
                }
              />
              <Route path="handovers/:requestId" element={<LegalHandoverDetailPage />} />
              <Route path="ledger" element={<RolePlaceholderPage title="Sổ cái chứng thực RFC 3161" />} />
              <Route path="vneid" element={<RolePlaceholderPage title="Tra cứu VNeID & CSDL Hộ tịch" />} />
              <Route path="smartca" element={<RolePlaceholderPage title="Chứng thư số SmartCA HSM L4" />} />
              <Route path="shamir" element={<RolePlaceholderPage title="Khóa niêm phong Shamir MPC" />} />
            </Route>
          </Route>

          {/* 4. Khu vực Người Thụ Hưởng (Beneficiary) */}
          <Route element={<ProtectedRoute role="Beneficiary" />}>
            <Route path="/beneficiary" element={<BeneficiaryLayout />}>
              <Route index element={<Navigate to="assets" replace />} />
              <Route path="assets" element={<RolePlaceholderPage title="Tài sản thụ hưởng" />} />
              <Route path="status" element={<RolePlaceholderPage title="Tiến trình quy trình bàn giao" />} />
              <Route path="receipts" element={<RolePlaceholderPage title="Xác nhận & Biên nhận số" />} />
              <Route path="keys" element={<RolePlaceholderPage title="Khóa giải mã cá nhân E2EE" />} />
              <Route path="notifications" element={<RolePlaceholderPage title="Thông báo di sản & Tin nhắn" />} />
            </Route>
          </Route>

          {/* 5. Khu vực Quản Trị Hệ Thống (Admin) */}
          <Route element={<ProtectedRoute role="Admin" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<RolePlaceholderPage title="Trung tâm kiểm soát quản trị hệ thống" />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="hsm" element={<RolePlaceholderPage title="Giám sát mã hóa & Mô-đun HSM" />} />
              <Route path="handovers" element={<RolePlaceholderPage title="Giám sát quy trình bàn giao (Handover)" />} />
              <Route path="plans" element={<RolePlaceholderPage title="Gói dịch vụ & Giao dịch thanh toán" />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="settings" element={<RolePlaceholderPage title="Cấu hình tham số hệ thống" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
