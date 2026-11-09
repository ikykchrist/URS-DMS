import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AACCUPGroupTabs } from "@/components/aaccup/AACCUPGroupTabs"
import AACCUPManagement from "@/pages/AACCUPManagement"
import Submissions from "@/pages/Submissions"
import type { AreaSet } from "@/services/aaccup"

// =============================================================================
// AACCUPGroupPage — grouped admin surface for the accreditation sets
// plus the submission review view and the assignee task list. One sidebar
// entry ("Accreditation") with an in-page tab strip shared with the user portal.
// Deep links /aaccup, /iso, and /submissions all resolve here,
// and the active tab is synced to the URL (?tab=).
// =============================================================================

const SUPPORTED_TAB_VALUES = new Set(["AACCUP", "ISO", "submissions"])

const ADMIN_TABS = [
  { value: "AACCUP", label: "AACCUP" },
  { value: "ISO", label: "ISO 21001:2025" },
  { value: "submissions", label: "Submissions" },
]

interface AACCUPGroupPageProps {
  initialTab?: string
}

export default function AACCUPGroupPage({ initialTab = "AACCUP" }: AACCUPGroupPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlTab = searchParams.get("tab")
  const urlAreaSet = searchParams.get("areaSet")
  const locationParams = new URLSearchParams()
  for (const key of ["campus", "college", "scope", "program"]) {
    const value = searchParams.get(key)
    if (value) locationParams.set(key, value)
  }
  const locationQuery = locationParams.size ? `?${locationParams}` : ""
  const isSupportedTab = (value: string | null): value is string => Boolean(value && SUPPORTED_TAB_VALUES.has(value))
  const [tab, setTab] = useState<string>(isSupportedTab(urlTab) ? urlTab : initialTab)

  useEffect(() => {
    setTab(isSupportedTab(urlTab) ? urlTab : initialTab)
  }, [initialTab, urlTab])

  const navigation = useMemo(
    () => (
      <AACCUPGroupTabs
        value={tab}
        tabs={ADMIN_TABS}
        onValueChange={(value) => {
          if (value === "AACCUP") navigate(`/aaccup${locationQuery}`)
          else if (value === "ISO") navigate(`/iso${locationQuery}`)
          else if (value === "submissions") {
            const areaSet =
              urlAreaSet === "AACCUP" || urlAreaSet === "ISO"
                ? urlAreaSet
                : tab === "ISO" || initialTab === "ISO"
                  ? "ISO"
                  : tab === "AACCUP" || initialTab === "AACCUP"
                    ? "AACCUP"
                    : undefined
            navigate(areaSet ? `/submissions?areaSet=${areaSet}` : "/submissions")
          }
        }}
      />
    ),
    [initialTab, navigate, tab, urlAreaSet, locationQuery],
  )

  return (
    <div>
      {tab === "submissions" ? (
        <Submissions
          navigation={navigation}
          areaSet={urlAreaSet === "AACCUP" || urlAreaSet === "ISO" ? urlAreaSet : undefined}
        />
      ) : (
        <AACCUPManagement
          key={tab}
          areaSet={tab as AreaSet}
          navigation={navigation}
        />
      )}
    </div>
  )
}
