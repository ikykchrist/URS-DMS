import { describe, expect, it } from "vitest";
import { numberAreas } from "./aaccup.numbering";
const area = (id: string, code: string, day: number, programId: string | null = "program") => ({ id, code, createdAt: new Date(`2026-11-0${day}T00:00:00Z`), areaSet: "AACCUP", campusId: "campus", collegeId: "college", programId });
describe("area numbering", () => {
  it("is independent of alphabetical list order", () => {
    const rows = [area("new", "QA-6D9F21", 3), area("old", "SYSTEM-TESTING", 1)];
    expect([...numberAreas(rows)]).toEqual([["old", 1], ["new", 2]]);
  });
  it("retains explicit codes and does not mistake scope UUIDs for numbers", () => {
    const numbers = numberAreas([area("explicit", "AREA-4", 1), area("generated", "AACCUP-QA-39E02BF", 2)]);
    expect(numbers.get("explicit")).toBe(4); expect(numbers.get("generated")).toBe(1);
  });
  it("numbers college-wide and program areas separately", () => {
    const numbers = numberAreas([area("wide", "QA", 1, null), area("program", "QA", 2)]);
    expect(numbers.get("wide")).toBe(1); expect(numbers.get("program")).toBe(1);
  });
});
