import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  hashPassword,
  isBreachedPassword,
  legacyScryptHashForTest,
  needsPasswordRehash,
  validatePasswordStrength,
  verifyPassword
} from "../password";
import {
  createGoogleAuthorization,
  getGoogleOAuthConfig,
  validateGoogleOAuthState
} from "../oauth/google";
import { createCsrfToken, verifyCsrfToken } from "./csrf";
import { errorRedirect, safeRedirect } from "./http";
import {
  authRateLimitConfigs,
  authRateLimitKeys,
  progressiveCooldownMs
} from "./rate-limit";

const tests: Array<{
  name: string;
  run: () => void | Promise<void>;
}> = [];

function test(name: string, run: () => void | Promise<void>) {
  tests.push({ name, run });
}

process.env.AUTH_SECRET = "test-auth-secret-that-is-long-enough-for-tests";
process.env.HIBP_BREACH_CHECKS = "on";

test("password hashing uses bcrypt and verifies without plaintext storage", async () => {
  const hash = await hashPassword("Stronger-demo-password-42!");

  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.equal(hash.includes("Stronger-demo-password-42!"), false);
  assert.equal(await verifyPassword("Stronger-demo-password-42!", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
  assert.equal(needsPasswordRehash(hash), false);
});

test("legacy scrypt password hashes still verify and are marked for rehash", async () => {
  const legacyHash = await legacyScryptHashForTest("localroute-demo");

  assert.equal(await verifyPassword("localroute-demo", legacyHash), true);
  assert.equal(needsPasswordRehash(legacyHash), true);
});

test("weak password validation rejects common and low-complexity passwords", () => {
  const weak = validatePasswordStrength("password123", {
    email: "sam@example.com",
    username: "sam"
  });
  const strong = validatePasswordStrength("Pine-line!742-safe", {
    email: "sam@example.com",
    username: "sam"
  });

  assert.equal(weak.valid, false);
  assert.equal(weak.reasons.includes("length"), true);
  assert.equal(strong.valid, true);
});

test("breached password handling uses HIBP k-anonymity suffix matching", async () => {
  const password = "Pwned-password-42!";
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const suffix = sha1.slice(5);
  const fetcher = async () =>
    new Response(`00000000000000000000000000000000000:2\r\n${suffix}:19`);

  assert.equal(await isBreachedPassword(password, fetcher as typeof fetch), true);
});

test("CSRF tokens verify, reject tampering, and expire", () => {
  const now = Date.now();
  const token = createCsrfToken(now);

  assert.equal(verifyCsrfToken(token, now + 1000), true);
  assert.equal(verifyCsrfToken(`${token}x`, now + 1000), false);
  assert.equal(verifyCsrfToken(token, now + 3 * 60 * 60 * 1000), false);
});

test("login and signup rate limit configs add progressive cooldowns", () => {
  assert.equal(
    progressiveCooldownMs(5, authRateLimitConfigs.login),
    authRateLimitConfigs.login.failureCooldownBaseMs
  );
  assert.equal(
    progressiveCooldownMs(3, authRateLimitConfigs.signup),
    authRateLimitConfigs.signup.failureCooldownBaseMs
  );
  assert.equal(authRateLimitConfigs.passwordReset.maxAttempts, 5);
  assert.equal(authRateLimitConfigs.emailVerification.maxAttempts, 5);
});

test("rate limit keys hash IP and user identifiers", () => {
  const request = new Request("https://local.test/login", {
    headers: { "x-forwarded-for": "203.0.113.42" }
  });
  const keys = authRateLimitKeys("login", request, "SAM@EXAMPLE.COM");

  assert.equal(keys.length, 2);
  assert.equal(keys.some((key) => key.includes("sam@example.com")), false);
  assert.equal(keys.every((key) => /^[a-f0-9]{64}$/.test(key)), true);
});

test("generic auth errors do not echo submitted credentials", () => {
  const request = new Request("https://local.test/login?identifier=sam@example.com");
  const response = errorRedirect(request, "/login", "credentials");
  const location = response.headers.get("location");

  assert.equal(response.status, 303);
  assert.ok(location);
  assert.equal(new URL(location).searchParams.get("error"), "credentials");
  assert.equal(location?.includes("sam@example.com"), false);
});

test("safe redirects keep protected route redirects on-site", () => {
  assert.equal(safeRedirect("/admin/content"), "/admin/content");
  assert.equal(safeRedirect("https://evil.example/admin"), "/");
  assert.equal(safeRedirect("//evil.example/admin"), "/");
});

test("protected pages still redirect anonymous users to login", () => {
  const redirectProtectedFiles = [
    "src/app/admin/page.tsx",
    "src/app/admin/content/page.tsx",
    "src/app/settings/profile/page.tsx"
  ];

  for (const file of redirectProtectedFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(source, /redirect\(["'`]\/login\?redirectTo=/);
  }

  const courseSubmissionPage = readFileSync(
    join(process.cwd(), "src/app/courses/new/page.tsx"),
    "utf8"
  );

  assert.match(courseSubmissionPage, /href=["'`]\/login\?redirectTo=\/courses\/new/);
});

test("Google OAuth configuration and state are built from env vars", () => {
  process.env.GOOGLE_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
  process.env.AUTH_BASE_URL = "https://local.test";

  const request = new Request("https://local.test/login");
  const config = getGoogleOAuthConfig();
  const authorization = createGoogleAuthorization(request, "/courses/new");

  assert.equal(config.configured, true);
  assert.ok(authorization);
  assert.equal(authorization.url.hostname, "accounts.google.com");
  assert.equal(
    authorization.url.searchParams.get("redirect_uri"),
    "https://local.test/api/auth/google/callback"
  );

  const state = authorization.url.searchParams.get("state");
  const validated = validateGoogleOAuthState(
    request,
    authorization.cookieValue,
    state
  );

  assert.equal(validated?.redirectTo, "/courses/new");
});

async function main() {
  for (const { name, run } of tests) {
    try {
      await run();
      console.log(`ok - ${name}`);
    } catch (error) {
      console.error(`not ok - ${name}`);
      throw error;
    }
  }
}

void main();
