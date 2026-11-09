import { describe, expect, it } from "vitest";
import { areaReminderFor } from "./aaccup.area-deadline-reminder.service";

describe("area deadline reminder schedule", () => {
  const now = new Date("2026-11-09T12:00:00.000Z");
  const dateIn = (days: number) => new Date(now.getTime() + days * 86_400_000);

  it.each([
    [90, "DUE_3_MONTHS"],
    [30, "DUE_1_MONTH"],
    [7, "DUE_7_DAYS"],
    [3, "DUE_3_DAYS"],
  ])("emits the %i-day reminder once", (days, key) => {
    expect(areaReminderFor(dateIn(days), now)?.key).toBe(key);
  });

  it("does not emit outside the configured intervals", () => {
    expect(areaReminderFor(dateIn(2), now)).toBeNull();
  });
});
