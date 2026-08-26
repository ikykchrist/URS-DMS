import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";
import type { EmailMessageInput, EmailProvider } from "@/modules/email/email.types";

// =============================================================================
// URS-DMS — Email providers (Sprint 7.3)
// -----------------------------------------------------------------------------
// Two providers ship with the platform:
//
//   * `console` — the default. Renders the message through the winston logger
//     so the full outbound flow (queue → claim → deliver → audit) can be
//     exercised without an SMTP server. Selectable via EMAIL_PROVIDER=console.
//
//   * `smtp` — nodemailer transport configured from the SMTP_* env vars. The
//     transporter is created lazily on first use so a missing/invalid SMTP
//     config never fails server boot.
//
// Selecting the provider is env-driven (EMAIL_PROVIDER) — no hardcoded SMTP
// anywhere. The queue table records which provider handled each row so a
// provider swap mid-queue stays inspectable.
// =============================================================================

class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessageInput): Promise<void> {
    logger.info("[email:console] message delivered to log (no transport)", {
      to: message.to,
      subject: message.subject,
      bodyLength: message.body.length,
    });
    logger.debug("[email:console] body", { body: message.body });
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";

  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" }
          : undefined,
      });
    }
    return this.transporter;
  }

  async send(message: EmailMessageInput): Promise<void> {
    const info = await this.getTransporter().sendMail({
      from: env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      html: message.body,
    });
    logger.info("[email:smtp] message accepted by transport", {
      to: message.to,
      subject: message.subject,
      messageId: info.messageId,
    });
  }
}

export const consoleEmailProvider: EmailProvider = new ConsoleEmailProvider();
export const smtpEmailProvider: EmailProvider = new SmtpEmailProvider();

export function getEmailProvider(): EmailProvider {
  return env.EMAIL_PROVIDER === "smtp" ? smtpEmailProvider : consoleEmailProvider;
}
