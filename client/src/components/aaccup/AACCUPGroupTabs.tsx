import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs"

// =============================================================================
// AACCUPGroupTabs — the shared tab strip for the AACCUP group page.
// Used identically by the admin and user portals so navigation stays uniform.
// =============================================================================

export interface AACCUPGroupTabItem {
  value: string
  label: string
}

interface AACCUPGroupTabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: AACCUPGroupTabItem[]
}

export function AACCUPGroupTabs({ value, onValueChange, tabs }: AACCUPGroupTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto p-1">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="min-w-max px-4 py-2 text-[12px]">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
