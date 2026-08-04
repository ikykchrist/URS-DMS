import { Client as MinioClient } from "minio";
import { Readable } from "node:stream";
import { env } from "@/config/env";
import { ServiceUnavailableError } from "@/utils/errors";

// =============================================================================
// URS-DMS — MinIO object storage adapter
// Single-process singleton. Bucket is created on first boot.
// Streams uploads/downloads via presigned URLs so the API server never buffers
// large files in memory.
// =============================================================================

export interface PresignedUpload {
  url: string;
  objectKey: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
}

export interface PresignedDownload {
  url: string;
  objectKey: string;
  expiresInSeconds: number;
}

let client: MinioClient | null = null;
let bucketEnsured = false;

function getClient(): MinioClient {
  if (client) return client;
  client = new MinioClient({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  });
  return client;
}

export async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  const c = getClient();
  const exists = await c.bucketExists(env.MINIO_BUCKET).catch(() => false);
  if (!exists) {
    await c.makeBucket(env.MINIO_BUCKET, "us-east-1");
  }
  bucketEnsured = true;
}

function publicEndpoint(): string {
  if (env.MINIO_PUBLIC_ENDPOINT) return env.MINIO_PUBLIC_ENDPOINT;
  const proto = env.MINIO_USE_SSL ? "https" : "http";
  return `${proto}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;
}

function buildObjectKey(documentId: string, versionId: string, filename: string): string {
  const safe = filename.replace(/[^A-Za-z0-9._-]+/g, "_");
  return `documents/${documentId}/${versionId}/${safe}`;
}

export async function presignUpload(
  documentId: string,
  versionId: string,
  filename: string,
  mimeType: string,
  sizeBytes: number,
): Promise<PresignedUpload> {
  const c = getClient();
  const objectKey = buildObjectKey(documentId, versionId, filename);
  const expiresInSeconds = 15 * 60;
  try {
    const url = await c.presignedPutObject(env.MINIO_BUCKET, objectKey, expiresInSeconds);
    return {
      url,
      objectKey,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(sizeBytes),
        "x-amz-meta-original-filename": encodeURIComponent(filename),
      },
      expiresInSeconds,
    };
  } catch (err) {
    throw new ServiceUnavailableError("Storage unavailable", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function presignDownload(objectKey: string): Promise<PresignedDownload> {
  const c = getClient();
  const expiresInSeconds = 10 * 60;
  try {
    const url = await c.presignedGetObject(env.MINIO_BUCKET, objectKey, expiresInSeconds);
    return { url, objectKey, expiresInSeconds };
  } catch (err) {
    throw new ServiceUnavailableError("Storage unavailable", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function statObject(objectKey: string): Promise<{ size: number; etag: string }> {
  const c = getClient();
  try {
    const stat = await c.statObject(env.MINIO_BUCKET, objectKey);
    return { size: stat.size, etag: stat.etag };
  } catch (err) {
    throw new ServiceUnavailableError("Storage stat failed", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function deleteObject(objectKey: string): Promise<void> {
  const c = getClient();
  try {
    await c.removeObject(env.MINIO_BUCKET, objectKey);
  } catch (err) {
    throw new ServiceUnavailableError("Storage delete failed", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getObjectStream(objectKey: string): Promise<Readable> {
  const c = getClient();
  try {
    const stream = await c.getObject(env.MINIO_BUCKET, objectKey);
    return stream as Readable;
  } catch (err) {
    throw new ServiceUnavailableError("Storage fetch failed", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export function publicDownloadUrl(objectKey: string): string {
  return `${publicEndpoint()}/${env.MINIO_BUCKET}/${objectKey}`;
}

export function objectKeyFor(documentId: string, versionId: string, filename: string): string {
  return buildObjectKey(documentId, versionId, filename);
}
