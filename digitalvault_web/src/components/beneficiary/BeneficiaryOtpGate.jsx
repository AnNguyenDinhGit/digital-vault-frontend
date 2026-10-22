import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { BeneficiaryOtpContext } from '../../contexts/beneficiaryOtpContextInstance'
import { useAuth } from '../../hooks/useAuth'
import { MOCK_MODE } from '../../mocks/mode'
import { clearOtpVerified, isOtpVerified, markOtpVerified } from '../../utils/beneficiary'
import BeneficiaryOtpModal from './BeneficiaryOtpModal'

// Màn hình khóa khi chưa xác thực OTP
function LockedScreen({ onUnlock }) {
  return (
    <section className="av-locked-screen" aria-labelledby="otp-locked-title">
      <div className="av-locked-card">
        <span className="av-locked-icon">
          <LockKeyhole size={26} aria-hidden="true" />
        </span>
        <h1 id="otp-locked-title" className="mt-3 mb-2 fw-bold text-ink" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
          Dữ liệu di sản đang được niêm phong
        </h1>
        <p className="mb-4 fs-13 text-slate-500" style={{ lineHeight: 1.7 }}>
          Để bảo vệ tài sản thừa kế, mỗi phiên truy cập cổng Người thụ hưởng cần xác thực bằng mã OTP gửi tới email đã đăng ký.
        </p>
        <Button type="button" variant="primary" className="av-btn av-btn-md" onClick={onUnlock}>
          <ShieldCheck size={16} aria-hidden="true" />
          Xác thực OTP ngay
        </Button>
      </div>
    </section>
  )
}

// Cổng OTP bọc nội dung của khu vực Người thụ hưởng: chưa xác thực thì hiện màn hình khóa + modal OTP
export default function BeneficiaryOtpGate({ children, mockMode = MOCK_MODE }) {
  const { user } = useAuth()
  const userKey = user?.userId ?? user?.email ?? 'anonymous'
  const [verifiedFor, setVerifiedFor] = useState(() => (isOtpVerified(userKey) ? userKey : null))
  const [modalOpen, setModalOpen] = useState(true)
  const verified = verifiedFor === userKey

  const handleVerified = useCallback(() => {
    markOtpVerified(userKey)
    setVerifiedFor(userKey)
    setModalOpen(false)
  }, [userKey])

  // Gọi khi BE báo cần xác thực lại (phiên OTP hết hạn)
  const invalidate = useCallback(() => {
    clearOtpVerified()
    setVerifiedFor(null)
    setModalOpen(true)
  }, [])

  const value = useMemo(() => ({ verified, invalidate }), [verified, invalidate])

  return (
    <BeneficiaryOtpContext.Provider value={value}>
      {verified ? children : <LockedScreen onUnlock={() => setModalOpen(true)} />}
      {!verified && modalOpen && (
        <BeneficiaryOtpModal email={user?.email} mockMode={mockMode} onVerified={handleVerified} onClose={() => setModalOpen(false)} />
      )}
    </BeneficiaryOtpContext.Provider>
  )
}
