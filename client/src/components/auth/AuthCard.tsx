import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AuthCardProps {
  children: ReactNode
  className?: string
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div className={cn("bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-8 sm:p-10", className)}>
      {children}
    </div>
  )
}

interface AuthCardHeaderProps {
  children: ReactNode
  className?: string
}

export function AuthCardHeader({ children, className }: AuthCardHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      {children}
    </div>
  )
}

interface AuthCardTitleProps {
  children: ReactNode
  className?: string
}

export function AuthCardTitle({ children, className }: AuthCardTitleProps) {
  return (
    <h1 className={cn("text-2xl font-bold text-[#0F172A] mb-2", className)}>
      {children}
    </h1>
  )
}

interface AuthCardDescriptionProps {
  children: ReactNode
  className?: string
}

export function AuthCardDescription({ children, className }: AuthCardDescriptionProps) {
  return (
    <p className={cn("text-[#64748B] text-sm", className)}>
      {children}
    </p>
  )
}

interface AuthCardFooterProps {
  children: ReactNode
  className?: string
}

export function AuthCardFooter({ children, className }: AuthCardFooterProps) {
  return (
    <div className={cn("mt-6 text-center", className)}>
      {children}
    </div>
  )
}