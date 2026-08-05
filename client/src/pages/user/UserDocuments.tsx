import { FileText } from "lucide-react"
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
        description="Your personal repository — folders and files belong to your account"
        actions={
          <div className="flex items-center gap-2 text-[13px] text-gray-500">
            <FileText className="w-4 h-4" />
            Double-click to open
          </div>
        }
      />
      <RepositoryExplorer />
    </div>
  )
}