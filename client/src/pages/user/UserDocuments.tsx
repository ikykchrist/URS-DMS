import { PageHeader } from "@/components/layout/PageHeader"
import { RepositoryExplorer } from "@/components/repository/RepositoryExplorer"

// =============================================================================
// My Documents — personal, owner-scoped file management
// -----------------------------------------------------------------------------
// The logged-in user manages their own folders and files. Repositories are
// isolated per account — only the owner's records are shown.
// =============================================================================

export default function UserDocuments() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="My Documents"
        description="Manage and organize your personal documents."
      />
      <RepositoryExplorer />
    </div>
  )
}
