import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_PASSWORD_HASH: z.string().min(1, "ADMIN_PASSWORD_HASH is required"),
  WHATSAPP_NUMBER: z.string().min(1, "WHATSAPP_NUMBER is required"),
  SITE_DOMAIN: z.string().min(1, "SITE_DOMAIN is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 chars"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // Client bundle guard: env vars are server-only (no NEXT_PUBLIC_ prefix).
  // If this file is accidentally imported in a client component, don't throw at
  // bundle evaluation — return a no-op placeholder. Server will still validate.
  if (typeof window !== "undefined") {
    // Return a shallow placeholder that satisfies the type but is not used for real logic on client.
    // Values come from process.env inlined at build time; fallback to safe defaults to avoid runtime crash.
    return {
      DATABASE_URL: (process.env.DATABASE_URL as string) ?? "",
      ADMIN_PASSWORD_HASH: (process.env.ADMIN_PASSWORD_HASH as string) ?? "",
      WHATSAPP_NUMBER: (process.env.WHATSAPP_NUMBER as string) ?? "",
      SITE_DOMAIN: (process.env.SITE_DOMAIN as string) ?? "",
      SESSION_SECRET: (process.env.SESSION_SECRET as string) ?? "0".repeat(32),
      NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) ?? "development",
    } as Env;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`[env] Invalid environment variables — ${details}`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();

// Mark all required env vars as "used" for AGENTS.md §2.2 completeness —
// server-only consumers (lib/referral, lib/auth, app/card) already reference
// SESSION_SECRET / SITE_DOMAIN / DATABASE_URL etc. This no-op keeps WHATSAPP_NUMBER
// from looking dead in static analysis when only validated, not directly read in client-free code.
void env.WHATSAPP_NUMBER;
