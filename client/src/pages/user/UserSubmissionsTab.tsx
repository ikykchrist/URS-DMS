import { PageHeader } from "@/components/layout/PageHeader"
import { SubmissionsTable } from "@/components/aaccup/SubmissionsTable"

// =============================================================================
// UserSubmissionsTab — the user's "My Submissions" view inside the AACCUP
// group. Same table as the admin review surface, read-only: the server only
// returns the caller's own submissions (non-reviewer scoping).
// =============================================================================

export default function UserSubmissionsTab() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My Submissions"
        description="Your submitted evidence across the accreditation sets — statuses update after admin review."
      />
      <SubmissionsTable mode="view" />
    </div>
  )
}
