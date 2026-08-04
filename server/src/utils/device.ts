import { UAParser } from "ua-parser-js";

// =============================================================================
// URS-DMS — minimal UA parser for session metadata.
// We only extract what the session table needs; nothing else.
// =============================================================================

export interface DeviceInfo {
  device: string | null;
  browser: string | null;
}

export function parseUserAgent(userAgent: string | undefined): DeviceInfo {
  if (!userAgent) return { device: null, browser: null };
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const device = result.device.type ?? result.os.name ?? null;
  const browser = result.browser.name
    ? `${result.browser.name} ${result.browser.version ?? ""}`.trim()
    : null;
  return { device, browser };
}
