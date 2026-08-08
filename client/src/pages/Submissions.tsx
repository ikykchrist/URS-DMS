import { PageHeader } from "@/components/layout/PageHeader"
import { SubmissionsTable } from "@/components/aaccup/SubmissionsTable"

// =============================================================================
// Submissions — admin review surface for AACCUP / ISO / CERT submissions.
// Rendered as the "Submissions" tab of the AACCUP group page. The table
// itself is shared with the user portal (SubmissionsTable mode="view").
// =============================================================================

export default function Submissions() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Submissions"
        description="Review and manage AACCUP, ISO, and certification submissions."
      />
      <SubmissionsTable mode="review" />
    </div>
  )
}
