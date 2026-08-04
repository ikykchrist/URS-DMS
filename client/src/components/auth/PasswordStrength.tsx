import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
  password: string
  className?: string
}

interface Requirement {
  test: (password: string) => boolean
  label: string
}

const requirements: Requirement[] = [
  { test: (p) => p.length >= 8, label: "At least 8 characters" },
  { test: (p) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p) => /[0-9]/.test(p), label: "One number" },
  { test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), label: "One special character" },
]

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const metRequirements = requirements.filter((req) => req.test(password))
  const strengthPercent = (metRequirements.length / requirements.length) * 100

  const getStrengthColor = () => {
    if (strengthPercent <= 20) return "bg-red-500"
    if (strengthPercent <= 40) return "bg-orange-500"
    if (strengthPercent <= 60) return "bg-yellow-500"
    if (strengthPercent <= 80) return "bg-blue-500"
    return "bg-green-500"
  }

  const getStrengthLabel = () => {
    if (strengthPercent === 0) return "Very Weak"
    if (strengthPercent <= 20) return "Very Weak"
    if (strengthPercent <= 40) return "Weak"
    if (strengthPercent <= 60) return "Fair"
    if (strengthPercent <= 80) return "Good"
    return "Strong"
  }

  const getStrengthLabelColor = () => {
    if (strengthPercent <= 20) return "text-red-500"
    if (strengthPercent <= 40) return "text-orange-500"
    if (strengthPercent <= 60) return "text-yellow-600"
    if (strengthPercent <= 80) return "text-blue-500"
    return "text-green-500"
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#64748B]">Password strength</span>
        <span className={cn("text-xs font-medium", getStrengthLabelColor())}>
          {getStrengthLabel()}
        </span>
      </div>
      
      <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", getStrengthColor())}
          style={{ width: `${strengthPercent}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {requirements.map((req, index) => {
          const isMet = req.test(password)
          return (
            <li key={index} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                  isMet ? "bg-green-500" : "bg-[#E5E7EB]"
                )}
              >
                {isMet ? (
                  <Check className="w-2.5 h-2.5 text-white" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#64748B]" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs",
                  isMet ? "text-[#0F172A]" : "text-[#64748B]"
                )}
              >
                {req.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}