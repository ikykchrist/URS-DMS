import type { OnlineAaccupArea } from "@/services/aaccup"

export function accreditationAreaLabel(area: Pick<OnlineAaccupArea, "name" | "areaNumber">) {
  const number = area.areaNumber
  if (!number) return area.name
  return new RegExp(`^Area[ -]*${number}(?:\\b|$)`, "i").test(area.name) ? area.name : `Area ${number}: ${area.name}`
}
export interface AccreditationLocation {
  campus: string
  college: string
  scope: string
  program: string
}

export function matchesAccreditationLocation(area: OnlineAaccupArea, location: AccreditationLocation) {
  if (location.scope === "unassigned") return !area.campusId || !area.collegeId
  if (location.campus && area.campusId !== location.campus) return false
  if (location.college && area.collegeId !== location.college) return false
  if (location.scope === "college") return area.programId === null
  if (location.scope === "program" && location.program) return area.programId === location.program
  return true
}

