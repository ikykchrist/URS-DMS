import Redis from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

let client: Redis | null = null;
let subscriber: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 10) {
          logger.error("[redis] exhausted retries, giving up");
          return null;
        }
        return Math.min(times * 200, 3000);
      },
    });

    client.on("error", (err) => {
      logger.error("[redis] connection error", { err: err.message });
    });
    client.on("connect", () => {
      logger.info("[redis] connected");
    });
  }
  return client;
}

export function getRedisSubscriber(): Redis {
  if (!subscriber) {
    subscriber = getRedis().duplicate();
  }
  return subscriber;
}

export async function redisHealth(): Promise<{ status: string; latencyMs: number }> {
  try {
    const r = getRedis();
    const t0 = Date.now();
    await r.ping();
    return { status: "up", latencyMs: Date.now() - t0 };
  } catch {
    return { status: "down", latencyMs: 0 };
  }
}

export async function disconnectRedis(): Promise<void> {
  const promises: Promise<string>[] = [];
  if (client) promises.push(client.quit());
  if (subscriber) promises.push(subscriber.quit());
  await Promise.allSettled(promises);
  client = null;
  subscriber = null;
}
