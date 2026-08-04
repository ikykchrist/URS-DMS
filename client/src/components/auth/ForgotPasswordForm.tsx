import { useState, FormEvent } from "react"
import { Link } from "react-router-dom"
import { Mail, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react"
import { AuthCard, AuthCardHeader, AuthCardTitle, AuthCardDescription, AuthCardFooter } from "./AuthCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const [validationError, setValidationError] = useState("")

  const validateEmail = (email: string) => {
    if (!email) {
      setValidationError("Email is required")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError("Please enter a valid email address")
      return false
    }
    setValidationError("")
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!validateEmail(email)) return

    setIsLoading(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsLoading(false)
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <AuthCard>
        <AuthCardHeader>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <AuthCardTitle className="text-center">Check your email</AuthCardTitle>
          <AuthCardDescription className="text-center">
            We sent a password reset link to <span className="font-medium text-[#0F172A]">{email}</span>
          </AuthCardDescription>
        </AuthCardHeader>
        
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Password reset link expires in 24 hours</p>
            <p>Please check your inbox and spam folder if you don't receive the email.</p>
          </div>
        </div>

        <div className="mt-6">
          <Link to="/login">
            <Button
              variant="outline"
              className="w-full h-11 border-[#E5E7EB] text-[#64748B] hover:bg-gray-50"
            >
              Back to Login
            </Button>
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <AuthCardHeader>
        <div className="w-16 h-16 rounded-full bg-[#2563EB]/10 flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-[#2563EB]" />
        </div>
        <AuthCardTitle>Forgot Password</AuthCardTitle>
        <AuthCardDescription>
          No worries, we'll send you reset instructions
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
          <Label htmlFor="reset-email" className="text-[13px] font-medium text-[#0F172A]">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="admin@urs.edu.ph"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (validationError) validateEmail(e.target.value)
            }}
            disabled={isLoading}
            className={`h-11 ${validationError ? "border-red-500 focus:ring-red-500" : ""}`}
          />
          {validationError && (
            <p className="text-xs text-red-500">{validationError}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium rounded-lg shadow-sm transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending reset link...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>

      <AuthCardFooter>
        <Link 
          to="/login" 
          className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Login
        </Link>
      </AuthCardFooter>
    </AuthCard>
  )
}