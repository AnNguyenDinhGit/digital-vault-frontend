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
    <div className="flex min-h-screen flex-col bg-page">
      <LandingHeader />
      <main className="flex flex-1 items-center">
        <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-8 py-16 lg:grid-cols-[minmax(0,1fr)_480px]">
          <LandingHero />
          <div className="flex justify-center lg:justify-end">
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
