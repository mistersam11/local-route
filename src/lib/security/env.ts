function readAuthSecret() {
  return process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
}

export function isAuthSecretConfigured() {
  return Boolean(readAuthSecret());
}

export function canUseAuthSecret() {
  return isAuthSecretConfigured() || process.env.NODE_ENV !== "production";
}

export function getAuthSecret() {
  const secret = readAuthSecret();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production");
  }

  return "localroute-development-auth-secret";
}

export function getRequestOrigin(request: Request) {
  const configuredOrigin = process.env.AUTH_BASE_URL?.trim();

  if (configuredOrigin) {
    return new URL(configuredOrigin).origin;
  }

  return new URL(request.url).origin;
}
