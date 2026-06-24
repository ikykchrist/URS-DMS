import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AuthLayoutProps {
  children: ReactNode
  className?: string
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className={cn("min-h-screen flex", className)}>
      {/* Branding Panel - Left Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#2563EB] flex-col justify-between p-12 xl:p-16">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 15H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-white text-xl font-bold">URS-DMS</h1>
              <p className="text-white/70 text-sm">Document Management System</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#2563EB] to-transparent opacity-0"></div>
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
          <span>© 2024 University of Rizal System</span>
        </div>
      </div>

      {/* Form Panel - Right Side */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 xl:p-12 bg-[#F5F7FB]">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}