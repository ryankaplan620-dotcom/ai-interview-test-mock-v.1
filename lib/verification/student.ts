import { createHmac, timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/db/server";

/**
 * Student verification strategies.
 *
 * Controlled by STUDENT_VERIFICATION_MODE env var:
 *   "sheerid"    — use SheerID (production)
 *   "edu_email"  — fallback to .edu email verification (launch-day fallback)
 *
 * Either path results in a verified student_verifications row that qualifies
 * the user for the Student pricing tier.
 */

const VERIFICATION_MODE = (process.env.STUDENT_VERIFICATION_MODE ?? "edu_email") as
  | "sheerid"
  | "edu_email";

// SheerID verification expires after 1 year
const SHEERID_EXPIRY_DAYS = 365;

/**
 * Entry point — initiates student verification for a user.
 * Returns either a redirect URL (SheerID) or a status indicator (.edu flow).
 */
export async function initiateVerification({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<
  | { mode: "sheerid"; redirectUrl: string }
  | { mode: "edu_email"; status: "sent" | "already_verified" }
> {
  if (VERIFICATION_MODE === "sheerid") {
    const url = await createSheerIDSession({ userId, email });
    return { mode: "sheerid", redirectUrl: url };
  }

  return initiateEduEmailVerification({ userId, email });
}

// ==========================================================================
// SHEERID
// ==========================================================================

async function createSheerIDSession({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<string> {
  const apiKey = process.env.SHEERID_API_KEY;
  const programId = process.env.SHEERID_STUDENT_PROGRAM_ID;

  if (!apiKey || !programId) {
    throw new Error(
      "SheerID not configured. Set SHEERID_API_KEY and SHEERID_STUDENT_PROGRAM_ID, or switch STUDENT_VERIFICATION_MODE to 'edu_email'.",
    );
  }

  const supabase = createServiceRoleClient();

  // Create a pending verification row
  const { data: verification, error } = await supabase
    .from("student_verifications")
    .insert({
      user_id: userId,
      method: "sheerid",
      sheerid_program_id: programId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create verification record: ${error.message}`);
  }

  // Generate SheerID hosted verification URL
  // Reference: https://developer.sheerid.com/reference/retrieveverificationurl
  const url = new URL(`https://services.sheerid.com/verify/${programId}/`);
  url.searchParams.set("metadata[userId]", userId);
  url.searchParams.set("metadata[verificationId]", verification.id);
  url.searchParams.set("metadata[email]", email);

  return url.toString();
}

/**
 * Webhook handler — called by SheerID when verification completes.
 * Updates the student_verifications row based on the verification result.
 */
export async function handleSheerIDWebhook(payload: {
  verificationId: string;
  result: "verified" | "rejected" | "pending";
  metadata?: { userId?: string };
  rejectionReason?: string;
}) {
  const supabase = createServiceRoleClient();

  if (payload.result === "verified") {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SHEERID_EXPIRY_DAYS);

    await supabase
      .from("student_verifications")
      .update({
        status: "verified",
        sheerid_verification_id: payload.verificationId,
        verified_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("user_id", payload.metadata?.userId ?? "")
      .eq("method", "sheerid")
      .eq("status", "pending");
  } else if (payload.result === "rejected") {
    await supabase
      .from("student_verifications")
      .update({
        status: "rejected",
        rejection_reason: payload.rejectionReason ?? "Verification failed",
      })
      .eq("user_id", payload.metadata?.userId ?? "")
      .eq("method", "sheerid")
      .eq("status", "pending");
  }
}

// ==========================================================================
// .EDU EMAIL FALLBACK
// ==========================================================================

const EDU_DOMAINS_ALLOWLIST = [".edu", ".ac.uk", ".edu.au"];

function isEduEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  return EDU_DOMAINS_ALLOWLIST.some((suffix) => lower.endsWith(suffix));
}

async function initiateEduEmailVerification({
  userId,
  email,
}: {
  userId: string;
  email: string;
}): Promise<{ mode: "edu_email"; status: "sent" | "already_verified" }> {
  const supabase = createServiceRoleClient();

  // Check if the user's primary email is already a .edu (auto-verify case)
  if (isEduEmail(email)) {
    await supabase.from("student_verifications").upsert(
      {
        user_id: userId,
        method: "edu_email",
        edu_email: email,
        edu_email_verified_at: new Date().toISOString(),
        status: "verified",
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "user_id" },
    );
    return { mode: "edu_email", status: "already_verified" };
  }

  // Otherwise, user needs to provide a .edu email — create pending row
  await supabase.from("student_verifications").insert({
    user_id: userId,
    method: "edu_email",
    status: "pending",
  });

  return { mode: "edu_email", status: "sent" };
}

const EDU_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // link expires after 24h

function getEduTokenSecret(): string {
  const secret = process.env.STUDENT_VERIFICATION_SECRET;
  if (!secret) {
    throw new Error(
      "STUDENT_VERIFICATION_SECRET not configured. Set it (e.g. `openssl rand -hex 32`) before sending or confirming .edu verification links.",
    );
  }
  return secret;
}

function signEduTokenPayload(payload: string): string {
  return createHmac("sha256", getEduTokenSecret()).update(payload).digest("base64url");
}

/**
 * Generates a signed, time-limited token for the .edu email verification
 * link sent to the user. Call this from the route handler that sends the
 * verification email; embed the result in the link's `token` query param.
 */
export function generateEduEmailToken({ userId, eduEmail }: { userId: string; eduEmail: string }): string {
  const expiresAt = Date.now() + EDU_TOKEN_TTL_MS;
  const payload = JSON.stringify({ userId, eduEmail: eduEmail.toLowerCase().trim(), expiresAt });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const signature = signEduTokenPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * Confirm a .edu email via verification token.
 * Call from a route handler after the user clicks the verify link in their email.
 */
export async function confirmEduEmail({
  userId,
  eduEmail,
  token,
}: {
  userId: string;
  eduEmail: string;
  token: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isEduEmail(eduEmail)) {
    return { success: false, error: "Email must end in .edu, .ac.uk, or .edu.au" };
  }

  const [payloadB64, signature] = (token ?? "").split(".");
  if (!payloadB64 || !signature) {
    return { success: false, error: "Invalid verification token" };
  }

  const expectedSignature = signEduTokenPayload(payloadB64);
  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { success: false, error: "Invalid verification token" };
  }

  let parsed: { userId?: string; eduEmail?: string; expiresAt?: number };
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { success: false, error: "Invalid verification token" };
  }

  if (
    parsed.userId !== userId ||
    parsed.eduEmail !== eduEmail.toLowerCase().trim() ||
    typeof parsed.expiresAt !== "number" ||
    Date.now() > parsed.expiresAt
  ) {
    return { success: false, error: "Verification link is invalid or has expired" };
  }

  const supabase = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("student_verifications")
    .update({
      status: "verified",
      edu_email: eduEmail,
      edu_email_verified_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .eq("user_id", userId)
    .eq("method", "edu_email")
    .eq("status", "pending");

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
