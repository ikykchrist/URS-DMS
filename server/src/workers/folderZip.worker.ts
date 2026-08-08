// =============================================================================
// URS-DMS — Folder ZIP worker (BullMQ, Sprint 8.5)
// For large folders, generates a streaming ZIP, stores it temporarily in MinIO,
// and returns a short-lived presigned download URL via Redis.
// =============================================================================

import type { Job } from "bullmq";
import { PassThrough } from "node:stream";
import { Client as MinioClient } from "minio";
import { env } from "@/config/env";
import { getRedis } from "@/lib/redis";
import type { Actor } from "@/modules/folders/folders.service";

export interface FolderZipJobData {
  jobId: string;
  folderId: string;
  ownerId: string;
  repositoryId: string;
}

function getMinioClient(): MinioClient {
  return new MinioClient({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  });
}

export async function processFolderZipJob(job: Job<FolderZipJobData>): Promise<void> {
  const { jobId, folderId } = job.data;
  const { downloadFolderZip } = await import("@/modules/folders/folders.service");

  const actor: Actor = { id: job.data.ownerId, permissions: [] };
  const { filename, stream } = await downloadFolderZip(folderId, actor);

  const client = getMinioClient();
  const zipKey = `temp/zips/${jobId}-${folderId}.zip`;
  const pass = new PassThrough();

  const putPromise = client.putObject(env.MINIO_BUCKET, zipKey, pass);
  stream.pipe(pass);

  await putPromise;

  const downloadUrl = await client.presignedGetObject(
    env.MINIO_BUCKET,
    zipKey,
    env.ZIP_EXPIRATION_SECONDS,
  );

  const redis = getRedis();
  await redis.set(
    `zip:${jobId}`,
    JSON.stringify({
      url: downloadUrl,
      filename,
      key: zipKey,
      expiresAt: Date.now() + env.ZIP_EXPIRATION_SECONDS * 1000,
    }),
    "EX",
    env.ZIP_EXPIRATION_SECONDS,
  );

  await job.updateProgress(100);
}
