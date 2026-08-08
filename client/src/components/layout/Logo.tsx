import { useState, useEffect } from "react"
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const LOGO_CACHE_KEY = "urs_logo_url"
const LOGO_CACHE_TIME_KEY = "urs_logo_cache_time"
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min

async function fetchLogoUrl(): Promise<string | null> {
  try {
    const cached = localStorage.getItem(LOGO_CACHE_KEY)
    const cachedAt = localStorage.getItem(LOGO_CACHE_TIME_KEY)
    if (cached && cachedAt && Date.now() - Number(cachedAt) < CACHE_TTL_MS) {
      return cached
    }
    const resp = await fetch("/api/v1/root/setup/logo")
    if (!resp.ok) return null
    const data = await resp.json()
    const url = data?.data?.url ?? null
    if (url) {
      try { localStorage.setItem(LOGO_CACHE_KEY, url); localStorage.setItem(LOGO_CACHE_TIME_KEY, String(Date.now())) } catch {}
    }
    return url
  } catch {
    return null
  }
}

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  subtitle?: string
  className?: string
}

const sizes = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
}

export function Logo({ size = "md", showText = true, subtitle, className }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchLogoUrl().then(setLogoUrl)
  }, [])

  const sizeClass = sizes[size]

  if (logoUrl) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className={cn("rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0", sizeClass)}>
          <img src={logoUrl} alt="URS Logo" className="w-full h-full object-contain p-1" />
        </div>
        {showText && (
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">URS-DMS</h1>
            {subtitle && <p className="text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("rounded-xl bg-primary flex items-center justify-center flex-shrink-0", sizeClass)}>
        <FileText className={cn("text-white", size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5")} />
      </div>
      {showText && (
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">URS-DMS</h1>
          {subtitle && <p className="text-[11px] text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
