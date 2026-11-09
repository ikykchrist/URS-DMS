import type { Response } from "express";
import { env } from "@/config/env";

/**
 * Allow previewable files (PDF, images, video, audio, plain text) to render
 * inside an iframe on the configured frontend origins.
 *
 * Helmet applies `X-Frame-Options: SAMEORIGIN` and a `frame-ancestors 'self'`
 * CSP to every response. When the API host differs from the page host — for
 * example the app is served from `qadms.online` while the signed URL is minted
 * against `www.qadms.online` — the browser refuses to render the frame and
 * shows "… refused to connect", even though the bytes are fine. Images are
 * unaffected because `<img>` is not a framed document.
 *
 * A full origin (scheme + host) is a valid CSP source expression; stripping the
 * scheme produces a host-source that does not match the page's https origin
 * reliably, so the configured origins are used verbatim.
 */
export function setPreviewFrameHeaders(res: Response): void {
  const ancestors = new Set<string>(["'self'"]);
  for (const configured of env.CLIENT_URL) {
    const origin = configured.trim().replace(/\/+$/, "");
    if (origin) ancestors.add(origin);
    // Also add the counterpart origin (e.g., www ↔ apex, or http ↔ https)
    try {
      const parsed = new URL(origin);
      const counterpart = `${parsed.protocol}//${parsed.hostname}`;
      ancestors.add(counterpart);
    } catch {
      // Ignore malformed origins
    }
  }
  // Prefer the CSP directive; it supersedes X-Frame-Options, but removing the
  // inherited header keeps older browsers from blocking on it instead.
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", `frame-ancestors ${[...ancestors].join(" ")}`);
}
