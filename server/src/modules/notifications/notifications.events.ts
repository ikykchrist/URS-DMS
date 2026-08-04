import type { NotificationPriority, NotificationType } from "@prisma/client";

// =============================================================================
// URS-DMS — Notification event catalog (Sprint 7.3)
// -----------------------------------------------------------------------------
// The exhaustive list of events the platform can emit — mirrors the
// `NotificationType` DB enum one-to-one. Each entry carries the human-readable
// defaults used when a caller does not supply its own title/message, the
// default priority, and (where relevant) a default email subject/body used by
// `notifyUser` when the caller opts into the email channel.
//
// Emitting a notification is ONE call (notifyUser / notifyUsers) with a
// catalog `type` — modules never touch the Notification table directly.
// =============================================================================

export const NOTIFICATION_TYPE_VALUES = [
  "DOCUMENT_UPLOADED",
  "DOCUMENT_APPROVED",
  "DOCUMENT_REJECTED",
  "REQUEST_SUBMITTED",
  "REQUEST_APPROVED",
  "REQUEST_REJECTED",
  "AACCUP_SUBMISSION_APPROVED",
  "AACCUP_SUBMISSION_REJECTED",
  "PASSWORD_RESET",
  "ROLE_CHANGED",
  "SYSTEM_ANNOUNCEMENT",
] as const;

export interface NotificationEmailDefaults {
  subject: string;
  body: string;
}

export interface NotificationEventSpec {
  type: NotificationType;
  defaultTitle: string;
  defaultMessage: string;
  defaultPriority: NotificationPriority;
  email?: NotificationEmailDefaults;
}

export const NOTIFICATION_EVENTS: Record<NotificationType, NotificationEventSpec> = {
  DOCUMENT_UPLOADED: {
    type: "DOCUMENT_UPLOADED",
    defaultTitle: "Document uploaded",
    defaultMessage: "A document has been uploaded to the document repository.",
    defaultPriority: "MEDIUM",
    email: {
      subject: "URS-DMS — Document uploaded",
      body: "<p>A document has been uploaded to the URS document repository.</p>",
    },
  },
  DOCUMENT_APPROVED: {
    type: "DOCUMENT_APPROVED",
    defaultTitle: "Document approved",
    defaultMessage: "A document has been approved.",
    defaultPriority: "MEDIUM",
    email: {
      subject: "URS-DMS — Document approved",
      body: "<p>Your document has been approved.</p>",
    },
  },
  DOCUMENT_REJECTED: {
    type: "DOCUMENT_REJECTED",
    defaultTitle: "Document rejected",
    defaultMessage: "A document has been rejected. Please review the decision note.",
    defaultPriority: "HIGH",
    email: {
      subject: "URS-DMS — Document rejected",
      body: "<p>A document has been rejected. Please review the decision note in URS-DMS.</p>",
    },
  },
  REQUEST_SUBMITTED: {
    type: "REQUEST_SUBMITTED",
    defaultTitle: "Document request submitted",
    defaultMessage: "A document access request has been submitted.",
    defaultPriority: "MEDIUM",
  },
  REQUEST_APPROVED: {
    type: "REQUEST_APPROVED",
    defaultTitle: "Request approved",
    defaultMessage: "Your document access request has been approved.",
    defaultPriority: "MEDIUM",
    email: {
      subject: "URS-DMS — Request approved",
      body: "<p>Your document access request has been approved.</p>",
    },
  },
  REQUEST_REJECTED: {
    type: "REQUEST_REJECTED",
    defaultTitle: "Request rejected",
    defaultMessage: "Your document access request has been rejected.",
    defaultPriority: "MEDIUM",
    email: {
      subject: "URS-DMS — Request rejected",
      body: "<p>Your document access request has been rejected.</p>",
    },
  },
  AACCUP_SUBMISSION_APPROVED: {
    type: "AACCUP_SUBMISSION_APPROVED",
    defaultTitle: "Submission approved",
    defaultMessage: "Your AACCUP document submission has been approved.",
    defaultPriority: "MEDIUM",
  },
  AACCUP_SUBMISSION_REJECTED: {
    type: "AACCUP_SUBMISSION_REJECTED",
    defaultTitle: "Submission rejected",
    defaultMessage: "Your AACCUP document submission has been rejected.",
    defaultPriority: "HIGH",
  },
  PASSWORD_RESET: {
    type: "PASSWORD_RESET",
    defaultTitle: "Password changed",
    defaultMessage: "Your password has been changed. If this was not you, contact the administrator.",
    defaultPriority: "HIGH",
    email: {
      subject: "URS-DMS — Password changed",
      body: "<p>Your URS-DMS password has been changed. If this was not you, contact the administrator immediately.</p>",
    },
  },
  ROLE_CHANGED: {
    type: "ROLE_CHANGED",
    defaultTitle: "Role changed",
    defaultMessage: "Your account role has been changed by an administrator.",
    defaultPriority: "HIGH",
  },
  SYSTEM_ANNOUNCEMENT: {
    type: "SYSTEM_ANNOUNCEMENT",
    defaultTitle: "System announcement",
    defaultMessage: "An announcement from the system administrator.",
    defaultPriority: "HIGH",
  },
};
