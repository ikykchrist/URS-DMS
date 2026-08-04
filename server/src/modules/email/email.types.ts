// =============================================================================
// URS-DMS — Email module · shared types (Sprint 7.3)
// =============================================================================

/** Payload handed to a provider. `body` is HTML. */
export interface EmailMessageInput {
  to: string;
  subject: string;
  body: string;
}

/**
 * Provider contract — the ONLY way the service touches a transport. New
 * providers (sendgrid, ses, ...) implement this interface and register
 * themselves; nothing else in the codebase changes.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessageInput): Promise<void>;
}

/** A queue row claimed for delivery by the worker. */
export interface ClaimedEmailMessage extends EmailMessageInput {
  id: string;
  attempts: number;
  maxAttempts: number;
  provider: string;
}
