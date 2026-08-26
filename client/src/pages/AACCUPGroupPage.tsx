import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import AACCUPManagement from "@/pages/AACCUPManagement"
import Submissions from "@/pages/Submissions"
import { UserTasksTab } from "@/pages/user/UserTasksTab"
import type { AreaSet } from "@/services/aaccup"

// =============================================================================
// AACCUPGroupPage — grouped admin surface for the accreditation sets
// plus the submission review view and the assignee task list. One sidebar
// entry ("AACCUP") with an in-page tab strip shared with the user portal.
// Deep links /aaccup, /iso, /certification, /submissions all resolve here,
// and the active tab is synced to the URL (?tab=).
// =============================================================================

const SUPPORTED_TAB_VALUES = new Set(["AACCUP", "ISO", "CERT", "submissions", "tasks"])

interface AACCUPGroupPageProps {
  initialTab?: string
}

export default function AACCUPGroupPage({ initialTab = "AACCUP" }: AACCUPGroupPageProps) {
  const [searchParams] = useSearchParams()
  const urlTab = searchParams.get("tab")
  const urlAreaSet = searchParams.get("areaSet")
  const isSupportedTab = (value: string | null): value is string => Boolean(value && SUPPORTED_TAB_VALUES.has(value))
  const [tab, setTab] = useState<string>(isSupportedTab(urlTab) ? urlTab : initialTab)

  useEffect(() => {
    setTab(isSupportedTab(urlTab) ? urlTab : initialTab)
  }, [initialTab, urlTab])

  return (
    <div>
      {tab === "submissions" ? (
          <Submissions
            areaSet={urlAreaSet === "AACCUP" || urlAreaSet === "ISO" || urlAreaSet === "CERT" ? urlAreaSet : undefined}
          />
        ) : tab === "tasks" ? (
        <UserTasksTab />
        ) : (
          <AACCUPManagement
            key={tab}
            areaSet={tab as AreaSet}
          />
      )}
    </div>
  )
}
