import type { ReactNode } from "react"
import { PageHeader } from "@/components/layout/PageHeader"
import { SubmissionsTable } from "@/components/aaccup/SubmissionsTable"

// =============================================================================
// UserSubmissionsTab — the user's "My Submissions" view inside the AACCUP
// group. Same table as the admin review surface, read-only: the server only
// returns the caller's own submissions (non-reviewer scoping).
// =============================================================================

export default function UserSubmissionsTab({ navigation }: { navigation?: ReactNode }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My Submissions"
        description="Your submitted evidence across the accreditation sets — statuses update after admin review."
      />
      {navigation && <div className="mb-6 lg:mb-8">{navigation}</div>}
      <SubmissionsTable mode="view" />
    </div>
  )
}
