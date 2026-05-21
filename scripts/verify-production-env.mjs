import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const authSecret =
  process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
const isHostedBuild =
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

if (isHostedBuild && !authSecret) {
  console.error(
    "Missing AUTH_SECRET. Generate a long random value, set it in the deployment environment, and redeploy."
  );
  process.exit(1);
}
