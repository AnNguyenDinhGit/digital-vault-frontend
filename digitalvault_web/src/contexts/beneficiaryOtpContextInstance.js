import { createContext } from 'react'

// Context của cổng xác thực OTP Người thụ hưởng (tách file riêng để Fast Refresh hoạt động với BeneficiaryOtpGate)
export const BeneficiaryOtpContext = createContext(null)
