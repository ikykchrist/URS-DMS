interface NumberedArea {
  id: string;
  code: string;
  createdAt: Date;
  areaSet: string;
  campusId: string | null;
  collegeId: string | null;
  programId: string | null;
}

export function areaScopeKey(area: Omit<NumberedArea, "id" | "code" | "createdAt">): string {
  return JSON.stringify([area.areaSet, area.campusId, area.collegeId, area.programId]);
}

/** Retain explicit AREA-1 codes; otherwise use creation order within the audience.
 * Archived rows participate so archiving an area does not renumber its peers.
 */
export function numberAreas(rows: NumberedArea[]): Map<string, number> {
  const groups = new Map<string, NumberedArea[]>();
  for (const row of rows) {
    const key = areaScopeKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const numbers = new Map<string, number>();
  for (const group of groups.values()) {
    const reserved = new Set<number>();
    const sorted = [...group].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    for (const row of sorted) {
      const match = row.code.match(/^(?:(?:AACCUP|ISO|CERT)[-_.])?AREA[-_.]?(\d+)(?:[-_.]|$)/i);
      if (match && Number(match[1]) > 0) { numbers.set(row.id, Number(match[1])); reserved.add(Number(match[1])); }
    }
    let next = 1;
    for (const row of sorted) {
      if (numbers.has(row.id)) continue;
      while (reserved.has(next)) next += 1;
      numbers.set(row.id, next); reserved.add(next);
    }
  }
  return numbers;
}
