import { FileText } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { RepositoryExplorer } from "@/components/repository/RepositoryExplorer"

// =============================================================================
// Document Repository — personal, owner-scoped file management
// -----------------------------------------------------------------------------
// Each authenticated account manages its own folders and files (Windows-
// Explorer behavior: single click selects, double click opens). No other
// account's repository is visible here.
// =============================================================================

export default function DocumentRepository() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Document Repository"
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