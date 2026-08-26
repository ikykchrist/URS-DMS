import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { verifyFileToken } from "@/lib/fileToken";
import { getObjectStream, putObject, statObject } from "@/lib/storage";
import { env } from "@/config/env";
import { BadRequestError, UnauthorizedError } from "@/utils/errors";

// =============================================================================
// URS-DMS — signed file streaming routes
// -----------------------------------------------------------------------------
// These are the ONLY public file endpoints. Access is granted exclusively by a
// short-lived signed token (fileToken.ts) embedded in the URL the backend
// minted for an already-authorized user (document read/create permission etc.).
// MinIO stays on a private network; every byte flows through Express.
//
//   PUT /api/v1/files/upload?token=…   raw body -> MinIO (authorization was
//                                      already checked when the token was minted)
//   GET /api/v1/files/download?token=… MinIO -> stream (inline or attachment)
// =============================================================================

export const filesRouter: Router = Router();

function extractToken(query: unknown): string {
  const token = (query as { token?: string }).token;
  if (!token) throw new UnauthorizedError("Missing file token");
  return token;
}

filesRouter.put(
  "/upload",
  asyncHandler(async (req, res) => {
    const payload = (() => {
      try {
        return verifyFileToken(extractToken(req.query), "upload");
      } catch {
        throw new UnauthorizedError("Invalid or expired file token");
      }
    })();

    const sizeBytes = Number(req.headers["content-length"] ?? 0);
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new BadRequestError("Content-Length is required");
    }
    const mimeType = String(req.headers["content-type"] ?? "application/octet-stream");

    await putObject(payload.k, req, sizeBytes, mimeType);
    res.status(204).end();
  }),
);

filesRouter.get(
  "/download",
  asyncHandler(async (req, res) => {
    const payload = (() => {
      try {
        return verifyFileToken(extractToken(req.query), "download");
      } catch {
        throw new UnauthorizedError("Invalid or expired file token");
      }
    })();

    const stat = await statObject(payload.k);
    const stream = await getObjectStream(payload.k);

    const filename = payload.k.split("/").pop() ?? "file";
    const disposition = payload.i === 1 ? "inline" : "attachment";
    res.setHeader("Content-Type", stat.contentType);
    res.setHeader("Content-Length", String(stat.size));
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
    );
    // Previews render in iframes on the frontend origins (Cloudflare Pages
    // remotely, localhost in dev). Helmet's default CSP would block framing
    // from any other origin, so allowlist the configured client origins here.
    const frameAncestors = ["'self'", ...env.CLIENT_URL.map((o) => o.replace(/^https?:\/\//, ""))];
    res.setHeader("Content-Security-Policy", `frame-ancestors ${frameAncestors.join(" ")}`);
    res.setHeader("Cache-Control", "private, max-age=300");
    stream.on("error", () => {
      if (!res.headersSent) res.status(500);
      res.end();
    });
    stream.pipe(res);
  }),
);
