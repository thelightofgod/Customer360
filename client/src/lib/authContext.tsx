import { createContext, useContext } from 'react'

interface AuthCtx { email: string; onLogout: () => void }
export const AuthContext = createContext<AuthCtx>({ email: '', onLogout: () => {} })
export const useAuth = () => useContext(AuthContext)
