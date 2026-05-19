import { useState, useEffect, useCallback, useRef } from "react"
import {
  Search,
  FileText,
  Users,
  CheckCircle,
  ClipboardList,
  Award,
  ArrowRight,
  Command,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (page: string) => void
}

interface SearchResult {
  id: string
  type: "document" | "submission" | "user" | "task" | "audit" | "aaccup" | "page"
  title: string
  subtitle: string
  badge?: string
  page?: string
}

const searchIndex: SearchResult[] = [
  { id: "d1", type: "page", title: "Dashboard", subtitle: "Go to Dashboard", page: "dashboard" },
  { id: "d2", type: "page", title: "Submissions", subtitle: "Go to Submissions", page: "submissions" },
  { id: "d3", type: "page", title: "Document Repository", subtitle: "Go to Document Repository", page: "documents" },
  { id: "d4", type: "page", title: "AACCUP Management", subtitle: "Go to AACCUP Management", page: "aaccup" },
  { id: "d5", type: "page", title: "User Management", subtitle: "Go to User Management", page: "users" },
  { id: "d6", type: "page", title: "Audit Logs", subtitle: "Go to Audit Logs", page: "audit" },
  { id: "d7", type: "page", title: "Settings", subtitle: "Go to Settings", page: "settings" },
  { id: "s1", type: "submission", title: "Self-Study Report - COSI", subtitle: "Area 1 - Dr. Maria Santos", badge: "Approved" },
  { id: "s2", type: "submission", title: "Faculty Credentials - Dr. John Doe", subtitle: "Area 2 - Prof. John Doe", badge: "Approved" },
  { id: "s3", type: "submission", title: "Infrastructure Assessment Report", subtitle: "Area 6 - Engr. Sarah Cruz", badge: "Pending" },
  { id: "s4", type: "submission", title: "Curriculum Revision - BSIT", subtitle: "Area 3 - Dr. Peter Lim", badge: "Returned" },
  { id: "s5", type: "submission", title: "Laboratory Equipment Inventory", subtitle: "Area 7 - Ms. Ana Reyes", badge: "Approved" },
  { id: "s6", type: "submission", title: "Annual Report 2023", subtitle: "Area 10 - Mr. James Wilson", badge: "Pending" },
  { id: "s7", type: "submission", title: "Student Handbook 2024", subtitle: "Area 4 - Ms. Lisa Chen", badge: "Approved" },
  { id: "s8", type: "submission", title: "Faculty Development Plan", subtitle: "Area 2 - Prof. Robert Garcia", badge: "Pending" },
  { id: "u1", type: "user", title: "Dr. Maria Santos", subtitle: "College of Info Sciences" },
  { id: "u2", type: "user", title: "Prof. John Doe", subtitle: "College of Engineering" },
  { id: "u3", type: "user", title: "Engr. Sarah Cruz", subtitle: "Facilities Management" },
  { id: "u4", type: "user", title: "Dr. Peter Lim", subtitle: "College of Info Sciences" },
  { id: "a1", type: "aaccup", title: "Area 1: Vision, Mission, and Educational Goals", subtitle: "Completed - 100%" },
  { id: "a2", type: "aaccup", title: "Area 2: Faculty", subtitle: "In Progress - 75%" },
  { id: "a3", type: "aaccup", title: "Area 3: Curriculum and Instruction", subtitle: "In Progress - 60%" },
  { id: "a4", type: "aaccup", title: "Area 4: Support Services", subtitle: "Pending - 30%" },
  { id: "a5", type: "aaccup", title: "Area 5: Library", subtitle: "In Progress - 85%" },
  { id: "a6", type: "aaccup", title: "Area 6: Physical Plant", subtitle: "Overdue - 45%" },
]

const typeConfig = {
  document: { icon: FileText, color: "text-gray-500", bg: "bg-gray-100" },
  submission: { icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50" },
  user: { icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
  task: { icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
  audit: { icon: ClipboardList, color: "text-gray-600", bg: "bg-gray-100" },
  aaccup: { icon: Award, color: "text-primary", bg: "bg-primary/10" },
  page: { icon: ArrowRight, color: "text-gray-500", bg: "bg-gray-100" },
}

export function CommandPalette({ open, onOpenChange, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = query.trim()
    ? searchIndex.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : searchIndex.filter((item) => item.type === "page")

  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.page) {
        onNavigate(result.page)
      }
      onOpenChange(false)
    },
    [onNavigate, onOpenChange]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case "Enter":
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          onOpenChange(false)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, results, selectedIndex, handleSelect, onOpenChange])

  useEffect(() => {
    const selected = listRef.current?.querySelector(`[data-selected="true"]`)
    selected?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, submissions, users, tasks..."
            className="flex-1 text-[14px] outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] font-medium text-gray-500">
            ESC
          </kbd>
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-gray-500">
              No results found for "{query}"
            </div>
          ) : (
            <>
              {!query.trim() && (
                <div className="px-3 py-1.5">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2 mb-1">
                    Navigation
                  </p>
                </div>
              )}
              {results.map((result, index) => {
                const config = typeConfig[result.type]
                const Icon = config.icon
                return (
                  <button
                    key={result.id}
                    data-selected={index === selectedIndex}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      index === selectedIndex ? "bg-gray-50" : "hover:bg-gray-50/50"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config.bg)}>
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">
                        {result.title}
                      </p>
                      <p className="text-[12px] text-gray-500 truncate">{result.subtitle}</p>
                    </div>
                    {result.badge && (
                      <Badge
                        variant={
                          result.badge === "Approved"
                            ? "success"
                            : result.badge === "Pending"
                            ? "warning"
                            : "danger"
                        }
                        className="text-[10px] flex-shrink-0"
                      >
                        {result.badge}
                      </Badge>
                    )}
                    {result.type === "page" && (
                      <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-gray-200 bg-white px-1 font-mono text-[10px]">
              <Command className="w-2.5 h-2.5" />
            </kbd>
            <span>+</span>
            <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-gray-200 bg-white px-1 font-mono text-[10px]">
              K
            </kbd>
            <span className="ml-1">to open</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="inline-flex h-4 items-center rounded border border-gray-200 bg-white px-1 font-mono text-[10px]">
              ↑
            </kbd>
            <kbd className="inline-flex h-4 items-center rounded border border-gray-200 bg-white px-1 font-mono text-[10px]">
              ↓
            </kbd>
            <span className="ml-1">to navigate</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <kbd className="inline-flex h-4 items-center rounded border border-gray-200 bg-white px-1 font-mono text-[10px]">
              ↵
            </kbd>
            <span className="ml-1">to select</span>
          </div>
        </div>
      </div>
    </div>
  )
}
