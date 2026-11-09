import { describe, expect, it } from "vitest";

import { NOTIFICATION_EVENTS } from "@/modules/notifications/notifications.events";

describe("notification email catalog", () => {
  it.each([
    "FOLDER_SHARED_ACCESS",
    "AACCUP_SUBMISSION_APPROVED",
    "AACCUP_SUBMISSION_RETURNED",
    "AACCUP_SUBMISSION_REJECTED",
    "STORAGE_WARNING",
  ] as const)("provides one centralized email template for %s", (type) => {
    const email = NOTIFICATION_EVENTS[type].email;

    expect(email?.subject).toMatch(/^URS-DMS/);
    expect(email?.body).toMatch(/^<p>.+<\/p>$/);
  });
});
