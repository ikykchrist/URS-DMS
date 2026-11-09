import { describe, expect, it } from "vitest";
import { parseByteRange } from "@/utils/byteRange";

describe("parseByteRange", () => {
  it("returns null when no range is requested", () => {
    expect(parseByteRange(undefined, 1000)).toBeNull();
    expect(parseByteRange("", 1000)).toBeNull();
  });

  it("parses a closed range", () => {
    expect(parseByteRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99, length: 100 });
  });

  it("parses an open-ended range to the last byte", () => {
    expect(parseByteRange("bytes=900-", 1000)).toEqual({ start: 900, end: 999, length: 100 });
  });

  it("parses a suffix range", () => {
    expect(parseByteRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999, length: 100 });
  });

  it("clamps an end beyond the object size", () => {
    expect(parseByteRange("bytes=0-5000", 1000)).toEqual({ start: 0, end: 999, length: 1000 });
  });

  it("rejects unsatisfiable ranges", () => {
    expect(parseByteRange("bytes=1000-1005", 1000)).toBe("invalid");
    expect(parseByteRange("bytes=500-100", 1000)).toBe("invalid");
    expect(parseByteRange("bytes=-0", 1000)).toBe("invalid");
    expect(parseByteRange("bytes=0-0", 0)).toBe("invalid");
  });

  it("ignores unsupported multi-range and malformed headers", () => {
    expect(parseByteRange("bytes=0-10,20-30", 1000)).toBeNull();
    expect(parseByteRange("items=0-10", 1000)).toBeNull();
  });
});
