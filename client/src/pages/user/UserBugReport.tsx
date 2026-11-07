import { PageHeader } from "@/components/layout/PageHeader"
import { BugReportForm } from "@/components/bugReports/BugReportForm"

export default function UserBugReport() {
  return (
    <div className="content-padding max-w-3xl">
      <PageHeader title="Bug Report" description="Tell us about an issue you encounter in QA-DMS." />
      <BugReportForm />
    </div>
  )
}
