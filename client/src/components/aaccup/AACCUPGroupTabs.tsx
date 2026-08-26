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
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-white p-1.5 shadow-soft">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="min-w-max rounded-xl px-5 py-2.5 text-[12px] font-semibold text-gray-500 transition-all hover:bg-navy-50 hover:text-navy-900 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-soft"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
