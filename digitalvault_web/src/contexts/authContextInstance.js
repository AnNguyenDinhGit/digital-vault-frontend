import { createContext } from 'react'

// Tách context ra file riêng để Fast Refresh hoạt động với AuthProvider
export const AuthContext = createContext(null)

export const USER_STORAGE_KEY = 'aeterna.user'
