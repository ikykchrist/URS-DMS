import { useState, FormEvent } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { Loader2, AlertCircle, CheckCircle, Lock } from "lucide-react"
import { AuthCard, AuthCardHeader, AuthCardTitle, AuthCardDescription, AuthCardFooter } from "./AuthCard"
import { PasswordInput } from "./PasswordInput"
import { PasswordStrength } from "./PasswordStrength"
import { Button } from "@/components/ui/Button"

interface ResetPasswordFormProps {
  onSuccess?: () => void
}

export function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const [validationErrors, setValidationErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})

  const validateForm = () => {
    const errors: { newPassword?: string; confirmPassword?: string } = {}
    
    if (!newPassword) {
      errors.newPassword = "New password is required"
    } else if (newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters"
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password"
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    if (!token || token.length < 6) {
      setError("Invalid or expired reset token. Please request a new password reset.")
      return
    }

    if (!validateForm()) return

    setIsLoading(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsLoading(false)
    setIsSuccess(true)
    onSuccess?.()
  }

  if (!token || token.length < 6) {
    return (
      <AuthCard>
        <AuthCardHeader>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <AuthCardTitle className="text-center">Invalid Reset Link</AuthCardTitle>
          <AuthCardDescription className="text-center">
            This password reset link is invalid or has expired. Please request a new one.
          </AuthCardDescription>
        </AuthCardHeader>
        
        <div className="mt-6 space-y-3">
          <Link to="/forgot-password">
            <Button
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium rounded-lg shadow-sm"
            >
              Request New Reset Link
            </Button>
          </Link>
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

  if (isSuccess) {
    return (
      <AuthCard>
        <AuthCardHeader>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <AuthCardTitle className="text-center">Password Reset Complete</AuthCardTitle>
          <AuthCardDescription className="text-center">
            Your password has been successfully reset. You can now sign in with your new password.
          </AuthCardDescription>
        </AuthCardHeader>
        
        <div className="mt-6">
          <Link to="/login">
            <Button
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium rounded-lg shadow-sm"
            >
              Sign In with New Password
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
          <Lock className="w-8 h-8 text-[#2563EB]" />
        </div>
        <AuthCardTitle>Reset Password</AuthCardTitle>
        <AuthCardDescription>
          Create a new password for your account
        </AuthCardDescription>
      </AuthCardHeader>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <PasswordInput
          id="new-password"
          label="New Password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          error={validationErrors.newPassword}
          required
        />

        {newPassword && (
          <PasswordStrength password={newPassword} />
        )}

        <PasswordInput
          id="confirm-password"
          label="Confirm New Password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          error={validationErrors.confirmPassword}
          required
        />

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium rounded-lg shadow-sm transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting password...
            </>
          ) : (
            "Reset Password"
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