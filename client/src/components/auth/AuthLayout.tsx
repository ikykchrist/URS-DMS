import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/layout/Logo"

interface AuthLayoutProps {
  children: ReactNode
  className?: string
  /** Max width of the form column. Defaults to `max-w-md` (login size);
   *  taller forms like registration pass `max-w-2xl`. */
  maxWidthClass?: string
}

export function AuthLayout({ children, className, maxWidthClass }: AuthLayoutProps) {
  const isLogin = className?.split(" ").includes("login-page")
  return (
    // h-full chain: html/body/#root are already height:100% + overflow:hidden
    // (index.css), so this root exactly fills the viewport without relying on
    // viewport units that some mobile webviews do not support.
    <div className={cn("h-full flex bg-canvas dark:bg-canvas-dark", className)}>
      {/* Branding Panel - Left Side */}
      <div className={cn("hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-primary-700 flex-col justify-between p-12 xl:p-16", isLogin && "!p-[42px] !pt-12 !pb-7")}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            {isLogin ? (
              <div>
                <img src="/urs-qa-dms-logo-horizontal-white.svg" alt="URS QA-DMS" className="h-14 w-auto max-w-[340px] object-contain object-left" />
                <p className="mt-2 text-[11px] font-medium text-white/75">Quality Assurance Data Management System</p>
              </div>
            ) : (
              <Logo size="lg" showText={true} subtitle="Quality Assurance Data Management System" onDark />
            )}
          </div>

          <div className="mb-12">
            <h2 className={cn("text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-6", isLogin && "!text-[38px] tracking-tight")}>
              {isLogin ? "One workspace for quality assurance." : <>Secure.<br />
              Organized.<br />
              Accessible.</>}
            </h2>
            <p className="text-white/80 text-lg leading-relaxed max-w-md">
              {isLogin
                ? "Organize evidence, coordinate reviews, and track accreditation progress."
                : "A centralized platform for managing university documents efficiently and securely."}
            </p>
          </div>
        </div>

        {/* Illustration */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 to-transparent opacity-0"></div>
          {isLogin ? (
            <figure className="mx-auto w-full max-w-[500px]" aria-label="Evidence moving through review toward accreditation">
              <svg viewBox="0 0 560 250" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-auto w-full overflow-visible" role="img">
                <title>Quality assurance workflow</title>
                <defs>
                  <linearGradient id="qa-flow" x1="88" y1="195" x2="468" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#93C5FD" stopOpacity="0.18" />
                    <stop offset="0.48" stopColor="#BFDBFE" stopOpacity="0.8" />
                    <stop offset="1" stopColor="white" />
                  </linearGradient>
                  <linearGradient id="qa-sheet" x1="80" y1="76" x2="220" y2="210" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white" stopOpacity="0.16" />
                    <stop offset="1" stopColor="white" stopOpacity="0.04" />
                  </linearGradient>
                  <filter id="qa-glow" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="9" />
                  </filter>
                </defs>

                <path d="M91 190C178 221 209 108 301 132C378 152 386 71 457 70" stroke="url(#qa-flow)" strokeWidth="1.5" strokeDasharray="3 7" />
                <path d="M104 198C194 225 224 129 302 148C389 169 405 93 478 86" stroke="white" strokeOpacity="0.1" />

                <g transform="rotate(-7 135 150)">
                  <rect x="65" y="91" width="132" height="112" rx="12" fill="url(#qa-sheet)" stroke="white" strokeOpacity="0.16" />
                  <rect x="82" y="72" width="132" height="112" rx="12" fill="#173775" stroke="white" strokeOpacity="0.3" />
                  <path d="M104 103H168M104 120H184M104 137H151" stroke="white" strokeOpacity="0.56" strokeWidth="4" strokeLinecap="round" />
                  <path d="M176 72V96H214" stroke="white" strokeOpacity="0.22" />
                </g>

                <g>
                  <circle cx="300" cy="134" r="43" fill="#102C63" stroke="white" strokeOpacity="0.24" />
                  <circle cx="300" cy="134" r="31" stroke="#93C5FD" strokeOpacity="0.44" strokeDasharray="2 5" />
                  <path d="M286 134L296 144L316 122" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="300" cy="134" r="4" fill="white" fillOpacity="0.08" />
                </g>

                <circle cx="462" cy="77" r="57" fill="#60A5FA" fillOpacity="0.14" filter="url(#qa-glow)" />
                <g transform="translate(422 37)">
                  <path d="M40 1.5L73.3 20.75V59.25L40 78.5L6.66 59.25V20.75L40 1.5Z" fill="#173775" stroke="white" strokeWidth="2.5" />
                  <path d="M40 16L60.5 27.75V51.25L40 63L19.5 51.25V27.75L40 16Z" stroke="#BFDBFE" strokeOpacity="0.72" />
                  <path d="M27 39.5L36 48.5L54 30.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </g>

                <g fill="white">
                  <circle cx="91" cy="190" r="3" />
                  <circle cx="300" cy="134" r="3" />
                  <circle cx="462" cy="77" r="3" />
                </g>

                <g fontFamily="Inter, ui-sans-serif, system-ui" fontSize="11" fontWeight="600" letterSpacing="1.3" fill="white">
                  <text x="76" y="230" fillOpacity="0.62">EVIDENCE</text>
                  <text x="274" y="202" fillOpacity="0.62">REVIEW</text>
                  <text x="421" y="178" fillOpacity="0.78">ACCREDITED</text>
                </g>
                <text x="421" y="198" fontFamily="Inter, ui-sans-serif, system-ui" fontSize="10" fill="white" fillOpacity="0.42">Quality, made visible.</text>
              </svg>
            </figure>
          ) : <svg width="100%" height="200" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-20">
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
          </svg>}
        </div>

        <div className="flex items-center gap-6 text-white/60 text-sm">
          <span>© 2026 University of Rizal System</span>
        </div>
      </div>

      {/* Form Panel - Right Side.
          Fixed-height internal scroll area. The card is centered with auto
          margins on a min-h-full column: when the card fits it is vertically
          centered; when it is taller the margins collapse to zero and the
          panel scrolls naturally from the very top — nothing can be clipped
          or pushed past the screen on any device. */}
      <div className="flex-1 h-full min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex flex-col min-h-full px-4 py-6 sm:px-6 sm:py-10 md:px-10 md:py-12 xl:px-12">
          <div className={cn("m-auto w-full", maxWidthClass ?? "max-w-md")}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
