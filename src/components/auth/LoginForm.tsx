import { useState, FormEvent } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { AuthCard, AuthCardHeader, AuthCardTitle, AuthCardDescription, AuthCardFooter } from "./AuthCard"
import { PasswordInput } from "./PasswordInput"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Switch } from "@/components/ui/Switch"
import { useAuth } from "@/context/AuthContext"

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoading, rememberMe, setRememberMe } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({})

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {}
    
    if (!email) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!password) {
      errors.password = "Password is required"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setValidationErrors({})

    if (!validateForm()) return

    const success = await login(email, password)
    
    if (success) {
      onSuccess?.()
    } else {
      setError("Invalid email or password. Please try again.")
    }
  }

  return (
    <AuthCard>
      <AuthCardHeader>
        <AuthCardTitle>Sign in to your account</AuthCardTitle>
        <AuthCardDescription>
          Enter your credentials to access the document management system
        </AuthCardDescription>
      </AuthCardHeader>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] font-medium text-[#0F172A]">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@urs.edu.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={`h-11 ${validationErrors.email ? "border-red-500 focus:ring-red-500" : ""}`}
          />
          {validationErrors.email && (
            <p className="text-xs text-red-500">{validationErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px] font-medium text-[#0F172A]">
              Password <span className="text-red-500">*</span>
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs text-[#2563EB] hover:underline font-medium"
            >
              Forgot Password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            error={validationErrors.password}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
              disabled={isLoading}
              className="data-[state=checked:bg-[#2563EB]"
            />
            <Label htmlFor="remember-me" className="text-sm text-[#64748B] cursor-pointer">
              Remember me
            </Label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium rounded-lg shadow-sm transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <AuthCardFooter className="mt-6">
        <p className="text-xs text-[#64748B]">
          Demo credentials: <span className="font-medium text-[#0F172A]">admin@urs.edu.ph</span> / <span className="font-medium text-[#0F172A]">password123</span>
        </p>
      </AuthCardFooter>
    </AuthCard>
  )
}