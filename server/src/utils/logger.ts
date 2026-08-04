import winston from "winston";
import { env } from "@/config/env";
import path from "node:path";

// =============================================================================
// URS-DMS — winston logger
// In development: pretty console output.
// In production: JSON to stdout (picked up by Docker) + persistent files.
// =============================================================================

const logDir = path.resolve(process.cwd(), "logs");

const transports: winston.transport[] = [
  new winston.transports.Console({
    format:
      env.NODE_ENV === "production"
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
              return `${timestamp} ${level} ${message}${rest}`;
            }),
          ),
  }),
];

if (env.NODE_ENV === "production") {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "app.log"),
      level: "info",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: "urs-dms-server" },
  transports,
});
