import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { UserAccreditationView } from "@/pages/user/UserAccreditationView"
import { UserTasksTab } from "@/pages/user/UserTasksTab"
import UserSubmissionsTab from "@/pages/user/UserSubmissionsTab"
import type { AreaSet } from "@/services/aaccup"

// =============================================================================
// UserAACCUPGroup — grouped user surface for the accreditation sets, the
// user's own submissions, and their assigned tasks. Deep links /user/iso and
// /user/certification preserve the set via `initialTab`.
// =============================================================================

const SUPPORTED_TAB_VALUES = new Set(["AACCUP", "ISO", "CERT", "submissions", "tasks"])

interface UserAACCUPGroupProps {
  initialTab?: string
}

export default function UserAACCUPGroup({ initialTab = "AACCUP" }: UserAACCUPGroupProps) {
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
        <UserSubmissionsTab areaSet={urlAreaSet === "AACCUP" || urlAreaSet === "ISO" ? urlAreaSet : undefined} />
      ) : tab === "tasks" ? (
        <UserTasksTab />
      ) : (
        <UserAccreditationView
          key={tab}
          areaSet={tab as AreaSet}
        />
      )}
    </div>
  )
}
