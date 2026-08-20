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
let publicClient: MinioClient | null = null;
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

// Signing client for the PUBLIC endpoint (e.g. a Cloudflare tunnel). The
// presigned URL must be signed for the exact host the browser will reach —
// rewriting the host AFTER signing breaks the SigV4 signature (403).
function getPublicSigningClient(): MinioClient | null {
  if (!env.MINIO_PUBLIC_ENDPOINT) return null;
  if (publicClient) return publicClient;
  const url = new URL(env.MINIO_PUBLIC_ENDPOINT);
  const useSSL = url.protocol === "https:";
  const port = url.port ? Number(url.port) : useSSL ? 443 : 80;
  publicClient = new MinioClient({
    endPoint: url.hostname,
    port,
    useSSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  });
  return publicClient;
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
  const c = getPublicSigningClient() ?? getClient();
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
  const c = getPublicSigningClient() ?? getClient();
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
    const code = (err as { code?: string })?.code;
    if (code === "NoSuchKey" || code === "NotFound") {
      throw Object.assign(new Error("Object not found"), { code });
    }
    throw new ServiceUnavailableError("Storage stat failed", {
      reason: err instanceof Error ? err.message : String(err),
      minioCode: code,
    });
  }
}

/**
 * Sprint 8.3 — maintenance helpers (additive; behavior of existing calls
 * is unchanged).
 */

/** True when the object exists (used by integrity/orphan checks). */
export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    await getClient().statObject(env.MINIO_BUCKET, objectKey);
    return true;
  } catch {
    return false;
  }
}

/** Lists up to `limit` object keys in the bucket (maintenance scans). */
export async function listObjectKeys(limit: number): Promise<string[]> {
  const stream = getClient().listObjectsV2(env.MINIO_BUCKET, "", true);
  return new Promise((resolve, reject) => {
    const keys: string[] = [];
    const timer = setTimeout(() => {
      stream.destroy();
      resolve(keys);
    }, 60_000);
    stream.on("data", (obj) => {
      if (obj && obj.name && keys.length < limit) {
        keys.push(obj.name);
      }
      if (keys.length >= limit) {
        clearTimeout(timer);
        stream.destroy();
        resolve(keys);
      }
    });
    stream.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    stream.on("end", () => {
      clearTimeout(timer);
      resolve(keys);
    });
  });
}

/** Safe MinIO connectivity probe (bucket exists). */
export async function storageHealth(): Promise<{ status: string; bucketExists: boolean }> {
  try {
    const exists = await getClient().bucketExists(env.MINIO_BUCKET);
    return { status: exists ? "up" : "bucket_missing", bucketExists: exists };
  } catch {
    return { status: "down", bucketExists: false };
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

export async function putObject(
  objectKey: string,
  body: Readable | Buffer,
  size: number,
  mimeType: string,
): Promise<void> {
  try {
    await getClient().putObject(env.MINIO_BUCKET, objectKey, body, size, {
      "Content-Type": mimeType,
    });
  } catch (err) {
    throw new ServiceUnavailableError("Storage upload failed", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export function thumbnailObjectKey(objectKey: string): string {
  return `${objectKey}.thumbnail.webp`;
}

export function publicDownloadUrl(objectKey: string): string {
  return `${publicEndpoint()}/${env.MINIO_BUCKET}/${objectKey}`;
}

export function objectKeyFor(documentId: string, versionId: string, filename: string): string {
  return buildObjectKey(documentId, versionId, filename);
}
