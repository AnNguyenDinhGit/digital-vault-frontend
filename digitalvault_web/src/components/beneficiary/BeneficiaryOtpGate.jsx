import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from 'react-bootstrap'
import { checkBeneficiaryOtpSession } from '../../callapi/beneficiaryApi'
import { BeneficiaryOtpContext } from '../../contexts/beneficiaryOtpContextInstance'
import { useAuth } from '../../hooks/useAuth'
import { MOCK_MODE } from '../../mocks/mode'
import { clearOtpVerified, markOtpVerified, otpSessionExpiry, readOtpSessionHint } from '../../utils/beneficiary'
import { LoadingState } from './BeneficiaryUi'
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

// Tối đa của setTimeout (~24,8 ngày); vượt quá sẽ bị bắn ngay
const MAX_TIMER_MS = 2 ** 31 - 1

// Cổng OTP bọc nội dung của khu vực Người thụ hưởng: chưa xác thực thì hiện màn hình khóa + modal OTP.
// Đây chỉ là lớp UX: BE mới là nơi chặn dữ liệu (403/428). sessionStorage chỉ là gợi ý để khỏi nhập lại OTP khi tải lại
// trang, và luôn được BE xác nhận trước khi mở khóa.
export default function BeneficiaryOtpGate({ children, mockMode = MOCK_MODE }) {
  const { user } = useAuth()
  const userKey = user?.userId ?? user?.email ?? 'anonymous'
  // session: { userKey, expiresAt } đã được BE xác nhận (vừa verify xong hoặc probe thành công)
  const [session, setSession] = useState(null)
  const [checkedKey, setCheckedKey] = useState(() => (readOtpSessionHint(userKey) ? null : userKey))
  const [modalOpen, setModalOpen] = useState(true)
  const verified = session?.userKey === userKey
  const checking = !verified && checkedKey !== userKey

  // Có gợi ý phiên trong storage: hỏi BE xem phiên còn hiệu lực không rồi mới mở khóa
  useEffect(() => {
    const hint = readOtpSessionHint(userKey)
    if (!hint) return undefined
    let cancelled = false
    checkBeneficiaryOtpSession()
      .then(() => {
        if (!cancelled) setSession({ userKey, expiresAt: hint })
      })
      .catch((error) => {
        if (cancelled) return
        // 403/428: BE không còn công nhận phiên; lỗi khác (mạng...) không đủ căn cứ để khóa, BE vẫn chặn từng request
        if (error?.status === 403 || error?.status === 428) clearOtpVerified()
        else setSession({ userKey, expiresAt: hint })
      })
      .finally(() => {
        if (!cancelled) setCheckedKey(userKey)
      })
    return () => {
      cancelled = true
    }
  }, [userKey])

  const handleVerified = useCallback(
    (result) => {
      const expiresAt = markOtpVerified(userKey, otpSessionExpiry(result))
      setSession({ userKey, expiresAt })
      setCheckedKey(userKey)
      setModalOpen(false)
    },
    [userKey],
  )

  // Gọi khi BE báo cần xác thực lại (phiên OTP hết hạn)
  const invalidate = useCallback(() => {
    clearOtpVerified()
    setSession(null)
    setCheckedKey(userKey)
    setModalOpen(true)
  }, [userKey])

  // Tự khóa lại đúng lúc hết hạn phiên theo BE, không đợi request kế tiếp bị từ chối
  const expiresAt = verified ? session.expiresAt : null
  useEffect(() => {
    if (!expiresAt) return undefined
    const timer = setTimeout(invalidate, Math.min(MAX_TIMER_MS, Math.max(0, expiresAt - Date.now())))
    return () => clearTimeout(timer)
  }, [expiresAt, invalidate])

  const value = useMemo(() => ({ verified, invalidate }), [verified, invalidate])

  if (checking) return <LoadingState message="Đang kiểm tra phiên xác thực..." />

  return (
    <BeneficiaryOtpContext.Provider value={value}>
      {verified ? children : <LockedScreen onUnlock={() => setModalOpen(true)} />}
      {!verified && modalOpen && (
        <BeneficiaryOtpModal email={user?.email} mockMode={mockMode} onVerified={handleVerified} onClose={() => setModalOpen(false)} />
      )}
    </BeneficiaryOtpContext.Provider>
  )
}
