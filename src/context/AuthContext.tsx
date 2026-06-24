import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  rememberMe: boolean
  setRememberMe: (value: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MOCK_CREDENTIALS = {
  email: "admin@urs.edu.ph",
  password: "password123",
}

const REMEMBER_ME_KEY = "urs_dms_remember_me"
const AUTH_KEY = "urs_dms_auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    const storedRemember = localStorage.getItem(REMEMBER_ME_KEY)
    if (storedRemember === "true") {
      setRememberMe(true)
      const storedAuth = localStorage.getItem(AUTH_KEY)
      if (storedAuth === "true") {
        setIsAuthenticated(true)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))

    const isValid = email === MOCK_CREDENTIALS.email && password === MOCK_CREDENTIALS.password

    if (isValid) {
      setIsAuthenticated(true)
      
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, "true")
        localStorage.setItem(AUTH_KEY, "true")
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY)
        localStorage.removeItem(AUTH_KEY)
      }
    }

    setIsLoading(false)
    return isValid
  }

  const logout = () => {
    setIsAuthenticated(false)
    if (!rememberMe) {
      localStorage.removeItem(AUTH_KEY)
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, rememberMe, setRememberMe }}>
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