import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type UserRole = "admin" | "faculty" | "department"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  avatar?: string
  memberSince?: string
}

interface UserWithPassword extends User {
  password: string
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole }>
  logout: () => void
  rememberMe: boolean
  setRememberMe: (value: boolean) => void
}

const MOCK_CREDENTIALS: UserWithPassword[] = [
  {
    id: "admin-001",
    name: "Admin User",
    email: "admin@urs.edu.ph",
    password: "admin123",
    role: "admin",
    department: "Administration",
    avatar: "admin",
    memberSince: "2023-01-15",
  },
  {
    id: "faculty-001",
    name: "Maria Santos",
    email: "faculty@urs.edu.ph",
    password: "faculty123",
    role: "faculty",
    department: "College of Engineering",
    avatar: "faculty",
    memberSince: "2023-06-01",
  },
  {
    id: "faculty-002",
    name: "John Doe",
    email: "john@urs.edu.ph",
    password: "john123",
    role: "faculty",
    department: "College of Information Sciences",
    avatar: "john",
    memberSince: "2023-08-20",
  },
  {
    id: "dept-001",
    name: "Jane Smith",
    email: "dean@urs.edu.ph",
    password: "dean123",
    role: "department",
    department: "Dean's Office",
    avatar: "jane",
    memberSince: "2023-03-10",
  },
]

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const REMEMBER_ME_KEY = "urs_dms_remember_me"
const AUTH_KEY = "urs_dms_auth"
const USER_KEY = "urs_dms_user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [rememberMe, setRememberMe] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const storedRemember = localStorage.getItem(REMEMBER_ME_KEY)
    if (storedRemember === "true") {
      setRememberMe(true)
      const storedAuth = localStorage.getItem(AUTH_KEY)
      const storedUser = localStorage.getItem(USER_KEY)
      if (storedAuth === "true" && storedUser) {
        setIsAuthenticated(true)
        setUser(JSON.parse(storedUser))
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole }> => {
    setIsLoading(true)

    await new Promise(resolve => setTimeout(resolve, 1000))

    const foundUser = MOCK_CREDENTIALS.find(u => u.email === email && u.password === password)

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser
      setIsAuthenticated(true)
      setUser(userWithoutPassword)

      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, "true")
        localStorage.setItem(AUTH_KEY, "true")
        localStorage.setItem(USER_KEY, JSON.stringify(userWithoutPassword))
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY)
        localStorage.setItem(AUTH_KEY, "true")
        localStorage.setItem(USER_KEY, JSON.stringify(userWithoutPassword))
      }

      setIsLoading(false)
      return { success: true, role: foundUser.role }
    }

    setIsLoading(false)
    return { success: false }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    if (!rememberMe) {
      localStorage.removeItem(AUTH_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, rememberMe, setRememberMe }}>
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