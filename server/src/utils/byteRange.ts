// =============================================================================
// URS-DMS — HTTP byte-range parsing
// -----------------------------------------------------------------------------
// Supports one `Range: bytes=…` range, which is what browsers request for PDF
// viewers, <video>, <audio> and progressive image loading. Multi-range requests
// are deliberately treated as "no range": serving the full 200 body is a valid
// response and avoids multipart/byteranges complexity.
// =============================================================================

export interface ByteRange {
  start: number;
  end: number;
  length: number;
}

export type ParsedByteRange = ByteRange | "invalid" | null;

export function parseByteRange(header: string | undefined, size: number): ParsedByteRange {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) return null;
  const [, rawStart = "", rawEnd = ""] = match;
  if (!rawStart && !rawEnd) return "invalid";
  if (size <= 0) return "invalid";

  // Suffix form: `bytes=-500` means the final 500 bytes.
  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid";
    const start = Math.max(0, size - suffix);
    return { start, end: size - 1, length: size - start };
  }

  const start = Number(rawStart);
  if (!Number.isFinite(start) || start < 0 || start >= size) return "invalid";
  const requestedEnd = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isFinite(requestedEnd) || requestedEnd < start) return "invalid";
  const end = Math.min(requestedEnd, size - 1);
  return { start, end, length: end - start + 1 };
}
