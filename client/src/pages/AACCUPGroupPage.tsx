import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import AACCUPManagement from "@/pages/AACCUPManagement"
import Submissions from "@/pages/Submissions"
import { UserTasksTab } from "@/pages/user/UserTasksTab"
import { AACCUPGroupTabs, type AACCUPGroupTabItem } from "@/components/aaccup/AACCUPGroupTabs"
import type { AreaSet } from "@/services/aaccup"

// =============================================================================
// AACCUPGroupPage — grouped admin surface for the three accreditation sets
// plus the submission review view and the assignee task list. One sidebar
// entry ("AACCUP") with an in-page tab strip shared with the user portal.
// Deep links /aaccup, /iso, /certification, /submissions all resolve here,
// and the active tab is synced to the URL (?tab=).
// =============================================================================

const TABS: AACCUPGroupTabItem[] = [
  { value: "AACCUP", label: "AACCUP" },
  { value: "ISO", label: "ISO" },
  { value: "CERT", label: "Certification" },
  { value: "submissions", label: "Submissions" },
  { value: "tasks", label: "My Tasks" },
]

interface AACCUPGroupPageProps {
  initialTab?: string
}

export default function AACCUPGroupPage({ initialTab = "AACCUP" }: AACCUPGroupPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlTab = searchParams.get("tab")
  const urlAreaSet = searchParams.get("areaSet")
  const [tab, setTab] = useState<string>(urlTab && TABS.some((t) => t.value === urlTab) ? urlTab : initialTab)

  useEffect(() => {
    setTab(urlTab && TABS.some((t) => t.value === urlTab) ? urlTab : initialTab)
  }, [initialTab, urlTab])

  const handleTabChange = (value: string) => {
    setTab(value)
    if (value === "AACCUP") {
      searchParams.delete("tab")
    } else {
      searchParams.set("tab", value)
    }
    setSearchParams(searchParams, { replace: true })
  }

  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-0">
        <AACCUPGroupTabs value={tab} onValueChange={handleTabChange} tabs={TABS} />
      </div>
      {tab === "submissions" ? (
        <Submissions areaSet={urlAreaSet === "AACCUP" || urlAreaSet === "ISO" || urlAreaSet === "CERT" ? urlAreaSet : undefined} />
      ) : tab === "tasks" ? (
        <UserTasksTab />
      ) : (
        <AACCUPManagement key={tab} areaSet={tab as AreaSet} />
      )}
    </div>
  )
}
