import { prisma } from "@/lib/db";
import {
  getClientIp,
  hashPrivateLookupKey,
  normalizeIdentifier
} from "@/lib/security/identity";

export const authRateLimitConfigs = {
  login: {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000,
    failureCooldownStart: 5,
    failureCooldownBaseMs: 30 * 1000,
    maxCooldownMs: 15 * 60 * 1000
  },
  signup: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    failureCooldownStart: 3,
    failureCooldownBaseMs: 60 * 1000,
    maxCooldownMs: 60 * 60 * 1000
  },
  passwordReset: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    failureCooldownStart: 3,
    failureCooldownBaseMs: 60 * 1000,
    maxCooldownMs: 60 * 60 * 1000
  },
  emailVerification: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    failureCooldownStart: 3,
    failureCooldownBaseMs: 60 * 1000,
    maxCooldownMs: 60 * 60 * 1000
  },
  googleOAuth: {
    maxAttempts: 20,
    windowMs: 15 * 60 * 1000,
    failureCooldownStart: 8,
    failureCooldownBaseMs: 30 * 1000,
    maxCooldownMs: 15 * 60 * 1000
  }
} as const;

export type AuthRateLimitAction = keyof typeof authRateLimitConfigs;

export type RateLimitResult = {
  limited: boolean;
  retryAfterSeconds?: number;
};

export function retryAfterSeconds(blockedUntil: Date, now = new Date()) {
  return Math.max(
    1,
    Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000)
  );
}

export function progressiveCooldownMs(
  failures: number,
  config: Pick<
    (typeof authRateLimitConfigs)[AuthRateLimitAction],
    "failureCooldownStart" | "failureCooldownBaseMs" | "maxCooldownMs"
  >
) {
  if (failures < config.failureCooldownStart) {
    return 0;
  }

  const exponent = failures - config.failureCooldownStart;
  return Math.min(
    config.maxCooldownMs,
    config.failureCooldownBaseMs * 2 ** exponent
  );
}

export function authRateLimitKeys(
  action: AuthRateLimitAction,
  request: Request,
  identifier?: string | null
) {
  const keys = [`ip:${getClientIp(request)}`];
  const normalizedIdentifier = identifier ? normalizeIdentifier(identifier) : "";

  if (normalizedIdentifier) {
    keys.push(`identifier:${normalizedIdentifier}`);
  }

  return keys.map((key) => hashPrivateLookupKey(action, key));
}

export async function consumeAuthRateLimit(
  action: AuthRateLimitAction,
  keyHashes: string[],
  now = new Date()
): Promise<RateLimitResult> {
  const config = authRateLimitConfigs[action];

  for (const keyHash of keyHashes) {
    const bucket = await prisma.authRateLimit.findUnique({
      where: { action_keyHash: { action, keyHash } }
    });

    if (bucket?.blockedUntil && bucket.blockedUntil > now) {
      return {
        limited: true,
        retryAfterSeconds: retryAfterSeconds(bucket.blockedUntil, now)
      };
    }

    const insideWindow = Boolean(
      bucket && bucket.windowStartedAt.getTime() + config.windowMs > now.getTime()
    );
    const windowStartedAt = insideWindow && bucket ? bucket.windowStartedAt : now;
    const attempts = insideWindow && bucket ? bucket.attempts + 1 : 1;

    if (attempts > config.maxAttempts) {
      const blockedUntil = new Date(now.getTime() + config.windowMs);
      await prisma.authRateLimit.upsert({
        where: { action_keyHash: { action, keyHash } },
        create: {
          action,
          keyHash,
          attempts,
          blockedUntil,
          windowStartedAt: now,
          lastAttemptAt: now
        },
        update: {
          attempts,
          blockedUntil,
          lastAttemptAt: now,
          windowStartedAt
        }
      });

      return {
        limited: true,
        retryAfterSeconds: retryAfterSeconds(blockedUntil, now)
      };
    }

    await prisma.authRateLimit.upsert({
      where: { action_keyHash: { action, keyHash } },
      create: {
        action,
        keyHash,
        attempts,
        windowStartedAt: now,
        lastAttemptAt: now
      },
      update: {
        attempts,
        blockedUntil: null,
        lastAttemptAt: now,
        windowStartedAt
      }
    });
  }

  return { limited: false };
}

export async function recordAuthFailure(
  action: AuthRateLimitAction,
  keyHashes: string[],
  now = new Date()
) {
  const config = authRateLimitConfigs[action];

  for (const keyHash of keyHashes) {
    const bucket = await prisma.authRateLimit.findUnique({
      where: { action_keyHash: { action, keyHash } }
    });
    const failures = (bucket?.failures ?? 0) + 1;
    const cooldownMs = progressiveCooldownMs(failures, config);
    const blockedUntil = cooldownMs
      ? new Date(now.getTime() + cooldownMs)
      : bucket?.blockedUntil ?? null;

    await prisma.authRateLimit.upsert({
      where: { action_keyHash: { action, keyHash } },
      create: {
        action,
        keyHash,
        attempts: 1,
        failures,
        blockedUntil,
        windowStartedAt: now,
        lastAttemptAt: now
      },
      update: {
        failures,
        blockedUntil,
        lastAttemptAt: now
      }
    });
  }
}

export async function clearAuthFailures(
  action: AuthRateLimitAction,
  keyHashes: string[],
  now = new Date()
) {
  await prisma.authRateLimit.updateMany({
    where: {
      action,
      keyHash: { in: keyHashes }
    },
    data: {
      attempts: 0,
      failures: 0,
      blockedUntil: null,
      windowStartedAt: now,
      lastAttemptAt: now
    }
  });
}
