import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/layout/Logo"

interface AuthLayoutProps {
  children: ReactNode
  className?: string
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className={cn("min-h-[100dvh] flex", className)}>
      {/* Branding Panel - Left Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-primary-700 flex-col justify-between p-12 xl:p-16">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <Logo size="lg" showText={true} subtitle="Document Management System" className="[&_h1]:text-white [&_p]:text-white/70" />
          </div>

          <div className="mb-12">
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-6">
              Secure.<br />
              Organized.<br />
              Accessible.
            </h2>
            <p className="text-white/80 text-lg leading-relaxed max-w-md">
              A centralized platform for managing university documents efficiently and securely.
            </p>
          </div>
        </div>

        {/* Illustration */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 to-transparent opacity-0"></div>
          <svg width="100%" height="200" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-20">
            <rect x="50" y="80" width="120" height="80" rx="8" fill="white"/>
            <rect x="70" y="100" width="80" height="8" rx="2" fill="white" opacity="0.6"/>
            <rect x="70" y="116" width="60" height="6" rx="2" fill="white" opacity="0.4"/>
            <rect x="70" y="130" width="70" height="6" rx="2" fill="white" opacity="0.4"/>
            
            <rect x="200" y="60" width="100" height="60" rx="8" fill="white"/>
            <rect x="215" y="75" width="70" height="6" rx="2" fill="white" opacity="0.6"/>
            <rect x="215" y="89" width="50" height="4" rx="2" fill="white" opacity="0.4"/>
            <rect x="215" y="100" width="60" height="4" rx="2" fill="white" opacity="0.4"/>
            
            <rect x="230" y="140" width="120" height="50" rx="8" fill="white"/>
            <rect x="245" y="155" width="90" height="6" rx="2" fill="white" opacity="0.6"/>
            <rect x="245" y="169" width="60" height="4" rx="2" fill="white" opacity="0.4"/>
          </svg>
        </div>

        <div className="flex items-center gap-6 text-white/60 text-sm">
          <span>© 2026 University of Rizal System</span>
        </div>
      </div>

      {/* Form Panel - Right Side */}
      <div className="flex-1 min-h-[100dvh] overflow-y-auto bg-canvas dark:bg-canvas-dark px-3 py-5 sm:flex sm:items-center sm:justify-center sm:p-6 md:p-8 xl:p-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
