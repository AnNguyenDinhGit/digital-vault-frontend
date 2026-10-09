import { useCallback, useState } from 'react'
import LoginForm from '../components/auth/LoginForm'
import RegisterModal from '../components/auth/RegisterModal'
import LandingFooter from '../components/landing/LandingFooter'
import LandingHeader from '../components/landing/LandingHeader'
import LandingHero from '../components/landing/LandingHero'

// Trang chủ: giới thiệu + form đăng nhập; modal đăng ký mở trên cùng trang
export default function LandingPage() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const closeRegister = useCallback(() => setIsRegisterOpen(false), [])

  const handleRegisterSuccess = (email) => {
    setRegisteredEmail(email)
    setIsRegisterOpen(false)
  }

  return (
    <div className="d-flex min-vh-100 flex-column bg-page">
      <LandingHeader />
      <main className="d-flex flex-grow-1 align-items-center">
        <div className="av-container av-landing-grid">
          <LandingHero />
          <div className="d-flex justify-content-center justify-content-lg-end">
            <LoginForm
              key={registeredEmail}
              initialEmail={registeredEmail}
              notice={registeredEmail ? 'Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.' : ''}
              onOpenRegister={() => setIsRegisterOpen(true)}
            />
          </div>
        </div>
      </main>
      <LandingFooter />
      <RegisterModal
        open={isRegisterOpen}
        onClose={closeRegister}
        onSuccess={handleRegisterSuccess}
        onSwitchToLogin={closeRegister}
      />
    </div>
  )
}
