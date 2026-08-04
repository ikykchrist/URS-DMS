import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { authService } from "@/services/auth"
import type { User, UserRole } from "@/types/domain"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>
  logout: () => Promise<void>
  rememberMe: boolean
  setRememberMe: (value: boolean) => void
  init: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const REMEMBER_ME_KEY = "urs_dms_remember_me"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [rememberMe, setRememberMe] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(REMEMBER_ME_KEY)
    if (stored === "true") setRememberMe(true)
    authService.init().then(() => {
      const state = authService.getState()
      setIsAuthenticated(state.isAuthenticated)
      setIsLoading(false)
      if (state.user) setUser(state.user)
      else setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated)
      setIsLoading(state.isLoading)
      setUser(state.user as User | null)
    })
    return unsub
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password)
    if (result.success && result.user) {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, "true")
      }
      return { success: true, role: result.user.role }
    }
    return { success: false, error: result.error }
  }, [rememberMe])

  const logout = useCallback(async () => {
    await authService.logout()
    if (!rememberMe) {
      localStorage.removeItem(REMEMBER_ME_KEY)
    }
  }, [rememberMe])

  const handleSetRememberMe = useCallback((value: boolean) => {
    setRememberMe(value)
    if (value) {
      localStorage.setItem(REMEMBER_ME_KEY, "true")
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY)
    }
  }, [])

  const init = useCallback(async () => {
    setIsLoading(true)
    await authService.init()
    const state = authService.getState()
    setIsAuthenticated(state.isAuthenticated)
    setUser(state.user as User | null)
    setIsLoading(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        rememberMe,
        setRememberMe: handleSetRememberMe,
        init,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
