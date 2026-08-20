import sharp from "sharp";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getObjectStream, putObject, thumbnailObjectKey } from "@/lib/storage";

export interface DocumentThumbnailJob {
  objectKey: string;
  mimeType: string;
}

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
]);
const execFileAsync = promisify(execFile);

async function renderPdfThumbnail(objectKey: string): Promise<Buffer> {
  const directory = await mkdtemp(join(tmpdir(), "urs-dms-thumbnail-"));
  const inputPath = join(directory, "source.pdf");
  const outputBase = join(directory, "page");
  try {
    await pipeline(await getObjectStream(objectKey), createWriteStream(inputPath));
    await execFileAsync("pdftoppm", [
      "-f", "1",
      "-l", "1",
      "-singlefile",
      "-png",
      "-scale-to", "640",
      inputPath,
      outputBase,
    ]);
    return sharp(await readFile(`${outputBase}.png`))
      .resize(640, 480, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function processDocumentThumbnailJob(job: { data: DocumentThumbnailJob }): Promise<void> {
  const mimeType = job.data.mimeType.toLowerCase();
  let thumbnail: Buffer;
  if (IMAGE_TYPES.has(mimeType)) {
    const source = await getObjectStream(job.data.objectKey);
    thumbnail = await source
      .pipe(sharp())
      .resize(640, 480, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
  } else if (mimeType === "application/pdf") {
    thumbnail = await renderPdfThumbnail(job.data.objectKey);
  } else {
    return;
  }

  await putObject(
    thumbnailObjectKey(job.data.objectKey),
    thumbnail,
    thumbnail.length,
    "image/webp",
  );
}
