import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { UserAccreditationView } from "@/pages/user/UserAccreditationView"
import { UserTasksTab } from "@/pages/user/UserTasksTab"
import UserSubmissionsTab from "@/pages/user/UserSubmissionsTab"
import { AACCUPGroupTabs, type AACCUPGroupTabItem } from "@/components/aaccup/AACCUPGroupTabs"
import type { AreaSet } from "@/services/aaccup"

// =============================================================================
// UserAACCUPGroup — grouped user surface for the accreditation sets, the
// user's own submissions, and their assigned tasks. Same tab strip as the
// admin group (shared component); deep links /user/iso and
// /user/certification preserve the set via `initialTab`.
// =============================================================================

const TABS: AACCUPGroupTabItem[] = [
  { value: "AACCUP", label: "AACCUP" },
  { value: "ISO", label: "ISO" },
  { value: "CERT", label: "Certification" },
  { value: "submissions", label: "My Submissions" },
  { value: "tasks", label: "My Tasks" },
]

interface UserAACCUPGroupProps {
  initialTab?: string
}

export default function UserAACCUPGroup({ initialTab = "AACCUP" }: UserAACCUPGroupProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlTab = searchParams.get("tab")
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
      {tab === "submissions" ? (
        <UserSubmissionsTab navigation={<AACCUPGroupTabs value={tab} onValueChange={handleTabChange} tabs={TABS} />} />
      ) : tab === "tasks" ? (
        <UserTasksTab navigation={<AACCUPGroupTabs value={tab} onValueChange={handleTabChange} tabs={TABS} />} />
      ) : (
        <UserAccreditationView
          key={tab}
          areaSet={tab as AreaSet}
          navigation={<AACCUPGroupTabs value={tab} onValueChange={handleTabChange} tabs={TABS} />}
        />
      )}
    </div>
  )
}
