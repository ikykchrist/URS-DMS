import { z } from "zod";

// =============================================================================
// URS-DMS — environment variable validation
// Validates every required variable at boot. Missing or invalid values cause
// the server to fail fast (process.exit 1).
// =============================================================================

const booleanFromString = z.union([z.boolean(), z.string()]).transform((v) => {
  if (typeof v === "boolean") return v;
  return v.toLowerCase() === "true" || v === "1";
});

const integerFromString = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number.parseInt(v, 10) : v));

const trustProxySchema = z.union([
  z.literal("true"),
  z.literal("false"),
  z.literal("loopback"),
  integerFromString,
]);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: integerFromString.pipe(z.number().int().min(1).max(65535)).default(4000),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),

  CLIENT_URL: z
    .string()
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean))
    .pipe(
      z
        .array(z.string().url())
        .min(1, "At least one CLIENT_URL is required"),
    ),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  JWT_ISSUER: z.string().default("urs-dms"),
  JWT_AUDIENCE: z.string().default("urs-dms-client"),

  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: booleanFromString.default(false),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),

  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: integerFromString.pipe(z.number().int().min(1).max(65535)).default(9000),
  MINIO_USE_SSL: booleanFromString.default(false),
  MINIO_ACCESS_KEY: z.string().default("urs_minio_admin"),
  MINIO_SECRET_KEY: z.string().default("urs_minio_secret"),
  MINIO_BUCKET: z.string().default("urs-dms"),
  MINIO_PUBLIC_ENDPOINT: z.string().url().optional(),

  RATE_LIMIT_WINDOW_MS: integerFromString.pipe(z.number().int().min(1000)).default(900000),
  RATE_LIMIT_MAX: integerFromString.pipe(z.number().int().min(1)).default(100),

  // Sprint 2 additions
  MAX_FAILED_LOGIN_ATTEMPTS: integerFromString.pipe(z.number().int().min(1).max(20)).default(5),
  LOCK_DURATION_MIN: integerFromString.pipe(z.number().int().min(1).max(1440)).default(15),
  PASSWORD_MIN_LENGTH: integerFromString.pipe(z.number().int().min(8).max(128)).default(8),
  SESSION_REFRESH_ROTATION: booleanFromString.default(true),
  TRUST_PROXY: trustProxySchema.default(1),

  // Bootstrap admin (used by seed script only; not validated at runtime)
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
  BOOTSTRAP_ADMIN_EMPLOYEE_ID: z.string().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
  BOOTSTRAP_ADMIN_FIRST_NAME: z.string().optional(),
  BOOTSTRAP_ADMIN_LAST_NAME: z.string().optional(),

  // Sprint 7.4.1 — Bootstrap ROOT (used by seed script only). The initial
  // System Administrator account. ROOT is the only role that can create other
  // ROOT accounts (privilege-escalation guard), so the seed needs its own
  // credentials — deliberately separate from BOOTSTRAP_ADMIN_*.
  BOOTSTRAP_ROOT_EMAIL: z.string().email().optional(),
  BOOTSTRAP_ROOT_EMPLOYEE_ID: z.string().optional(),
  BOOTSTRAP_ROOT_PASSWORD: z.string().optional(),
  BOOTSTRAP_ROOT_FIRST_NAME: z.string().optional(),
  BOOTSTRAP_ROOT_LAST_NAME: z.string().optional(),

  // Sprint 7.3 — Email service. `console` is the default provider (logs the
  // rendered message instead of sending); `smtp` uses nodemailer with the
  // SMTP_* variables below. SMTP variables are required only when the smtp
  // provider is selected (enforced via superRefine below).
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: integerFromString.pipe(z.number().int().min(1).max(65535)).default(587),
  SMTP_SECURE: booleanFromString.default(false),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().trim().email().optional(),
})
  .superRefine((val, ctx) => {
    if (val.EMAIL_PROVIDER !== "smtp") return;
    if (!val.SMTP_HOST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message: "SMTP_HOST is required when EMAIL_PROVIDER=smtp",
      });
    }
    if (!val.SMTP_FROM) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_FROM"],
        message: "SMTP_FROM is required when EMAIL_PROVIDER=smtp",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = parseEnv();

// Express's `trust proxy` accepts: number | boolean | string | function | RegExp[]
export const trustProxyValue: number | boolean | string = (() => {
  const v = env.TRUST_PROXY;
  if (typeof v === "string") {
    if (v === "true") return true;
    if (v === "false") return false;
    if (v === "loopback") return "loopback";
    return Number.parseInt(v, 10);
  }
  return v;
})();
