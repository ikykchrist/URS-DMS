import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

interface PasswordInputProps {
  id?: string
  label?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  inputClassName?: string
  required?: boolean
  disabled?: boolean
  error?: string
}

export function PasswordInput({
  id,
  label,
  placeholder = "Enter password",
  value,
  onChange,
  className,
  inputClassName,
  required = false,
  disabled = false,
  error,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label 
          htmlFor={inputId} 
          className="text-[13px] font-medium text-[#0F172A]"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id={inputId}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            "h-11 pr-10",
            error && "border-red-500 focus:ring-red-500",
            inputClassName
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-[#64748B]" />
          ) : (
            <Eye className="w-4 h-4 text-[#64748B]" />
          )}
          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}