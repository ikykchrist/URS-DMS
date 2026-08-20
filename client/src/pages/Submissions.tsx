import type { ReactNode } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { SubmissionsTable } from "@/components/aaccup/SubmissionsTable"
import type { AreaSet } from "@/services/aaccup"

// =============================================================================
// Submissions — admin review surface for AACCUP / ISO / CERT submissions.
// Rendered as the "Submissions" tab of the AACCUP group page. The table
// itself is shared with the user portal (SubmissionsTable mode="view").
// =============================================================================

export default function Submissions({ areaSet, navigation }: { areaSet?: AreaSet; navigation?: ReactNode }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Submissions"
        description="Review and manage AACCUP, ISO, and certification submissions."
      />
      {navigation && <div className="mb-6 lg:mb-8">{navigation}</div>}
      <SubmissionsTable mode="review" areaSet={areaSet} />
    </div>
  )
}
