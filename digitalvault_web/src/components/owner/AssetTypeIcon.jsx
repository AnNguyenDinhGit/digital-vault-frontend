import { AtSign, Bitcoin, Box, CreditCard, FileText } from 'lucide-react'

// Icon theo loại tài sản; type lạ dùng icon hộp mặc định
export default function AssetTypeIcon({ type, size = 18 }) {
  switch (type) {
    case 'CryptoWallet':
      return <Bitcoin size={size} aria-hidden="true" />
    case 'BankAccount':
      return <CreditCard size={size} aria-hidden="true" />
    case 'Document':
      return <FileText size={size} aria-hidden="true" />
    case 'SocialAccount':
      return <AtSign size={size} aria-hidden="true" />
    default:
      return <Box size={size} aria-hidden="true" />
  }
}
