import { createHash, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const legacyScryptKeyLength = 64;
const bcryptCost = Number(process.env.BCRYPT_COST ?? 12);
const minPasswordLength = 12;
const breachedPasswordEndpoint = "https://api.pwnedpasswords.com/range";

type PasswordContext = {
  email?: string | null;
  username?: string | null;
};

const commonPasswords = new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "localroute",
  "localroute-demo",
  "qwerty123",
  "letmein123",
  "welcome123"
]);

function validBcryptCost() {
  return Number.isFinite(bcryptCost) && bcryptCost >= 12 ? bcryptCost : 12;
}

function hasBcryptPrefix(passwordHash: string) {
  return /^\$2[aby]\$\d{2}\$/.test(passwordHash);
}

async function verifyLegacyScryptPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedKey] = passwordHash.split(":");

  if (algorithm !== "scrypt" || !salt || !storedKey) {
    return false;
  }

  const storedBuffer = Buffer.from(storedKey, "base64url");
  const derivedBuffer = (await scrypt(
    password,
    salt,
    storedBuffer.length || legacyScryptKeyLength
  )) as Buffer;

  return (
    storedBuffer.length === derivedBuffer.length &&
    timingSafeEqual(storedBuffer, derivedBuffer)
  );
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, validBcryptCost());
}

export async function verifyPassword(
  password: string,
  passwordHash: string | null | undefined
) {
  if (!passwordHash) {
    return false;
  }

  if (hasBcryptPrefix(passwordHash)) {
    return bcrypt.compare(password, passwordHash);
  }

  return verifyLegacyScryptPassword(password, passwordHash);
}

export function needsPasswordRehash(passwordHash: string | null | undefined) {
  if (!passwordHash || !hasBcryptPrefix(passwordHash)) {
    return true;
  }

  return bcrypt.getRounds(passwordHash) < validBcryptCost();
}

export function validatePasswordStrength(
  password: string,
  context: PasswordContext = {}
) {
  const reasons: string[] = [];
  const loweredPassword = password.toLowerCase();
  const emailLocalPart = context.email?.split("@")[0]?.toLowerCase() ?? "";
  const username = context.username?.toLowerCase() ?? "";

  if (password.length < minPasswordLength) {
    reasons.push("length");
  }

  if (!/[a-z]/.test(password)) {
    reasons.push("lowercase");
  }

  if (!/[A-Z]/.test(password)) {
    reasons.push("uppercase");
  }

  if (!/\d/.test(password)) {
    reasons.push("number");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    reasons.push("symbol");
  }

  if (commonPasswords.has(loweredPassword)) {
    reasons.push("common");
  }

  if (username.length >= 3 && loweredPassword.includes(username)) {
    reasons.push("username");
  }

  if (emailLocalPart.length >= 3 && loweredPassword.includes(emailLocalPart)) {
    reasons.push("email");
  }

  return {
    valid: reasons.length === 0,
    reasons
  };
}

export async function isBreachedPassword(
  password: string,
  fetcher: typeof fetch = fetch
) {
  if (process.env.HIBP_BREACH_CHECKS?.toLowerCase() === "off") {
    return false;
  }

  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const response = await fetcher(`${breachedPasswordEndpoint}/${prefix}`, {
      headers: {
        "Add-Padding": "true",
        "User-Agent": "LocalRoute password check"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return false;
    }

    const body = await response.text();
    return body
      .split(/\r?\n/)
      .some((line) => line.split(":")[0]?.trim().toUpperCase() === suffix);
  } catch {
    return false;
  }
}

export function legacyScryptHashForTest(password: string, salt = "test-salt") {
  return scrypt(password, salt, legacyScryptKeyLength).then((derivedKey) => {
    return `scrypt:${salt}:${(derivedKey as Buffer).toString("base64url")}`;
  });
}
