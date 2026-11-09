import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  subtitle?: string
  className?: string
  onDark?: boolean
}

const sizes = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
}

export function Logo({ size = "md", showText = true, subtitle, className, onDark = false }: LogoProps) {
  const sizeClass = sizes[size]

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex items-center justify-center flex-shrink-0", sizeClass)}>
        <img
          src={onDark ? "/urs-qa-dms-symbol-white.svg" : "/urs-qa-dms-symbol.svg"}
          alt="URS QA-DMS logo"
          className="h-full w-full object-contain"
        />
      </div>
      {showText && (
        <div className="min-w-0">
          <h1 className={cn("text-[15px] font-extrabold tracking-tight truncate", onDark ? "text-white" : "text-gray-900 dark:text-gray-100")}>URS QA-DMS</h1>
          {subtitle && <p className={cn("text-[11px] font-medium", onDark ? "text-slate-400" : "text-gray-500 dark:text-gray-400")}>{subtitle}</p>}
        </div>
      )}
    </div>
  )
}
