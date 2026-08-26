// =============================================================================
// URS-DMS — shared streaming ZIP writer (store method, data descriptors)
// Builds a ZIP archive as a Readable: directory entries first, then each file's
// bytes pulled chunk-by-chunk from MinIO via getObjectStream. Nothing is held
// in memory; CRC32 is computed incrementally and written in post-file
// descriptors. Extracted from folders.service.ts so both folder downloads and
// AACCUP package exports share one archive implementation.
// =============================================================================

import { Readable } from "node:stream";
import { getObjectStream } from "@/lib/storage";

class IncrementalCrc32 {
  private table: Uint32Array;
  private crc = 0xffffffff;
  constructor() {
    this.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      this.table[n] = c >>> 0;
    }
  }
  update(chunk: Buffer): void {
    for (let i = 0; i < chunk.length; i++) {
      this.crc = (this.crc >>> 8) ^ (this.table[(this.crc ^ chunk.readUInt8(i)) & 0xff] ?? 0);
    }
  }
  digest(): number {
    return (this.crc ^ 0xffffffff) >>> 0;
  }
}

function dosTime(date: Date): number {
  return ((date.getHours() & 0x1f) << 11) | ((date.getMinutes() & 0x3f) << 5) | ((date.getSeconds() & 0x3e) >> 1);
}
function dosDate(date: Date): number {
  return (((date.getFullYear() - 1980) & 0x7f) << 9) | ((date.getMonth() + 1) & 0x0f) << 5 | (date.getDate() & 0x1f);
}

interface ZipEntryMeta {
  path: string;
  size: number;
  crc: number;
  offset: number;
  isDir: boolean;
  time: number;
  date: number;
}

const ZIP_LOCAL = 0x04034b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_EOCD = 0x06054b50;
const ZIP_DESCRIPTOR = 0x08074b50;

function zipLocalHeader(entry: ZipEntryMeta, useDescriptor: boolean): Buffer {
  const buf = Buffer.alloc(30);
  buf.writeUInt32LE(ZIP_LOCAL, 0);
  buf.writeUInt16LE(20, 4); // version needed
  buf.writeUInt16LE(useDescriptor ? 0x0008 : 0, 6); // data descriptor flag
  buf.writeUInt16LE(0, 8); // store (no compression)
  buf.writeUInt16LE(entry.time, 10);
  buf.writeUInt16LE(entry.date, 12);
  buf.writeUInt32LE(useDescriptor ? 0 : entry.crc, 14);
  buf.writeUInt32LE(useDescriptor ? 0 : entry.size, 18);
  buf.writeUInt32LE(useDescriptor ? 0 : entry.size, 22);
  buf.writeUInt16LE(entry.path.length, 26);
  buf.writeUInt16LE(0, 28);
  return Buffer.concat([buf, Buffer.from(entry.path, "utf8")]);
}

function zipDescriptor(crc: number, size: number): Buffer {
  const buf = Buffer.alloc(16);
  buf.writeUInt32LE(ZIP_DESCRIPTOR, 0);
  buf.writeUInt32LE(crc, 4);
  buf.writeUInt32LE(size, 8);
  buf.writeUInt32LE(size, 12);
  return buf;
}

function zipCentralEntry(entry: ZipEntryMeta): Buffer {
  const buf = Buffer.alloc(46);
  buf.writeUInt32LE(ZIP_CENTRAL, 0);
  buf.writeUInt16LE(20, 4); // version made by
  buf.writeUInt16LE(20, 6); // version needed
  buf.writeUInt16LE(0x0008, 8); // descriptor flag
  buf.writeUInt16LE(0, 10); // store
  buf.writeUInt16LE(entry.time, 12);
  buf.writeUInt16LE(entry.date, 14);
  buf.writeUInt32LE(entry.crc, 16);
  buf.writeUInt32LE(entry.size, 20);
  buf.writeUInt32LE(entry.size, 24);
  buf.writeUInt16LE(entry.path.length, 28);
  buf.writeUInt16LE(0, 30); // extra
  buf.writeUInt16LE(0, 32); // comment
  buf.writeUInt16LE(0, 34); // disk
  buf.writeUInt16LE(0, 36); // internal attrs
  buf.writeUInt32LE(entry.isDir ? 0x10 : 0, 38); // external attrs (dir bit)
  buf.writeUInt32LE(entry.offset, 42);
  return Buffer.concat([buf, Buffer.from(entry.path, "utf8")]);
}

function zipEocd(entryCount: number, centralSize: number, centralOffset: number): Buffer {
  const buf = Buffer.alloc(22);
  buf.writeUInt32LE(ZIP_EOCD, 0);
  buf.writeUInt16LE(0, 4);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(Math.min(entryCount, 0xffff), 8);
  buf.writeUInt16LE(Math.min(entryCount, 0xffff), 10);
  buf.writeUInt32LE(centralSize, 12);
  buf.writeUInt32LE(centralOffset, 16);
  buf.writeUInt16LE(0, 20);
  return buf;
}

export function sanitizeZipSegment(segment: string): string {
  return segment.replace(/[\\/]/g, "-").replace(/[^\x20-\x7e]/g, "_").trim();
}

export interface ZipDirectoryEntry {
  path: string;
  time: Date;
}

export interface ZipFileEntry {
  path: string;
  objectKey: string;
  size: number;
  time: Date;
}

/**
 * Build a streaming ZIP (store method, data descriptors) from directory and
 * file entries. Directory entries are emitted first, then each file's bytes
 * are streamed from MinIO. Returns a Readable backed by an async generator.
 * Throws mid-stream on an object size mismatch (surfaced via stream error).
 */
export function streamZipArchive(dirs: ZipDirectoryEntry[], files: ZipFileEntry[]): Readable {
  return Readable.from(
    (async function* generate(): AsyncGenerator<Buffer> {
      let offset = 0;
      const metas: ZipEntryMeta[] = [];

      // Directory entries first, then files.
      for (const dir of dirs) {
        const path = dir.path.endsWith("/") ? dir.path : `${dir.path}/`;
        const meta: ZipEntryMeta = {
          path,
          size: 0,
          crc: 0,
          offset,
          isDir: true,
          time: dosTime(dir.time),
          date: dosDate(dir.time),
        };
        yield zipLocalHeader(meta, false);
        offset += 30 + path.length;
        metas.push(meta);
      }

      for (const entry of files) {
        const crc = new IncrementalCrc32();
        const meta: ZipEntryMeta = {
          path: entry.path,
          size: entry.size,
          crc: 0,
          offset,
          isDir: false,
          time: dosTime(entry.time),
          date: dosDate(entry.time),
        };
        yield zipLocalHeader(meta, true);
        offset += 30 + entry.path.length;

        let streamed = 0;
        const objectStream = await getObjectStream(entry.objectKey);
        for await (const chunk of objectStream) {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          crc.update(buf);
          streamed += buf.length;
          yield buf;
        }
        if (streamed !== entry.size) {
          throw new Error(`Object size mismatch while zipping (${entry.path})`);
        }
        meta.crc = crc.digest();
        yield zipDescriptor(meta.crc, entry.size);
        offset += entry.size + 16;
        metas.push(meta);
      }

      const centralStart = offset;
      let centralSize = 0;
      for (const meta of metas) {
        const entry = zipCentralEntry(meta);
        centralSize += entry.length;
        yield entry;
      }
      yield zipEocd(metas.length, centralSize, centralStart);
    })(),
  );
}
