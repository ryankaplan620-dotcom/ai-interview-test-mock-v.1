import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = `${process.env.RESEND_FROM_NAME ?? "Folio"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@folio.io"}>`;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Send an email via Resend.
 * Gracefully degrades when not configured — logs to console instead of throwing.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) {
  if (!resend) {
    console.log(`[Email] (no Resend configured) To: ${to}, Subject: ${subject}`);
    return { id: null, skipped: true };
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      text,
      replyTo,
    });
    return { id: result.data?.id ?? null, skipped: false };
  } catch (err) {
    console.error("[Email] Send failed:", err);
    throw err;
  }
}

/**
 * Templated email wrapper — brand-consistent HTML frame + inline-stylesheet compatible.
 * All Folio transactional emails use this frame.
 */
export function brandFrame({
  heading,
  headingItalic,
  body,
  ctaText,
  ctaUrl,
}: {
  heading: string;
  headingItalic?: string;
  body: string; // HTML (trusted)
  ctaText?: string;
  ctaUrl?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Folio</title>
</head>
<body style="margin:0;padding:0;background:#0D1117;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;color:#F0F6FC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1117;padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <h1 style="margin:0;color:#F0F6FC;font-size:32px;font-weight:600;letter-spacing:-0.03em;line-height:1.15;">
            ${heading}${
              headingItalic
                ? `<br/><em style="font-family:Georgia,serif;font-weight:400;color:#00F590;">${headingItalic}</em>`
                : ""
            }
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;color:#A8B0BA;font-size:16px;line-height:1.65;">
          ${body}
        </td></tr>
        ${
          ctaText && ctaUrl
            ? `<tr><td style="padding:16px 0 32px;">
                <a href="${ctaUrl}" style="display:inline-block;background:#00F590;color:#0D1117;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:28px;">${ctaText}</a>
              </td></tr>`
            : ""
        }
        <tr><td style="padding-top:32px;border-top:1px solid #2A3139;">
          <p style="margin:0;color:#00F590;font-family:Georgia,serif;font-style:italic;font-size:14px;">
            Built to get you hired.
          </p>
          <p style="margin:6px 0 0;color:#6E7681;font-family:'SFMono-Regular',Consolas,monospace;font-size:11px;letter-spacing:0.2em;">
            FOLIO.IO
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ==========================================================================
// NAMED TEMPLATES
// ==========================================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io";

export async function sendWelcomeEmail(to: string, name: string) {
  const html = brandFrame({
    heading: "Welcome to",
    headingItalic: "Folio.",
    body: `
      <p>Hi ${name},</p>
      <p>Your 15-day free trial is live. You have full access to every interviewer persona, drill, and feedback dimension from day one.</p>
      <p>Your first session is free — no credit card required. Start a practice interview, get your Folio Score in under 90 seconds, and see exactly where you stand.</p>
    `,
    ctaText: "Start your first session →",
    ctaUrl: `${APP_URL}/session/new`,
  });
  const text = `Hi ${name},\n\nWelcome to Folio. Your 15-day free trial is live — full access from day one. Your first session is free, no credit card required.\n\nStart here: ${APP_URL}/session/new\n\n— Built to get you hired.\nfolio.io`;
  return sendEmail({ to, subject: "Welcome to Folio", html, text });
}

export async function sendTrialEndingEmail(to: string, name: string, daysLeft: number) {
  const html = brandFrame({
    heading: `Your trial ends in ${daysLeft} days.`,
    body: `
      <p>Hi ${name},</p>
      <p>Your Folio trial wraps up in ${daysLeft} days. Check your Folio Score to see how far you've come — then pick a plan to keep practicing.</p>
      <p>Cycle is $49 for 90 days (students only). Pro is $149 for a full year with firm calibration. Max is $249 for panels, superdays, hard mode, and priority feedback.</p>
    `,
    ctaText: "Pick a plan →",
    ctaUrl: `${APP_URL}/pricing`,
  });
  const text = `Hi ${name},\n\nYour Folio trial ends in ${daysLeft} days. Check your score and pick a plan: ${APP_URL}/pricing\n\n— Built to get you hired.`;
  return sendEmail({ to, subject: `Your Folio trial ends in ${daysLeft} days`, html, text });
}

export async function sendSessionSummaryEmail(to: string, name: string, sessionId: string, score: number) {
  const html = brandFrame({
    heading: `Your Folio Score:`,
    headingItalic: `${score}`,
    body: `
      <p>Hi ${name},</p>
      <p>Your latest session has been scored. You received a Folio Score of <strong style="color:#00F590;">${score}</strong> across four dimensions.</p>
      <p>View your full feedback — including quote-level breakdowns, improvement areas, and interviewer notes — on the session detail page.</p>
    `,
    ctaText: "View full feedback →",
    ctaUrl: `${APP_URL}/session/${sessionId}/feedback`,
  });
  const text = `Hi ${name},\n\nYour Folio Score: ${score}\n\nView your full feedback: ${APP_URL}/session/${sessionId}/feedback\n\n— Built to get you hired.\nfolio.io`;
  return sendEmail({ to, subject: `Your Folio Score: ${score}`, html, text });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = brandFrame({
    heading: "Reset your password.",
    body: `
      <p>We received a request to reset your Folio password. Click the button below to choose a new one.</p>
      <p style="color:#6E7681;font-size:13px;">If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>
    `,
    ctaText: "Reset password →",
    ctaUrl: resetUrl,
  });
  const text = `Reset your Folio password:\n\n${resetUrl}\n\nIf you didn't request this, ignore this email. The link expires in 1 hour.\n\n— folio.io`;
  return sendEmail({ to, subject: "Reset your Folio password", html, text });
}

export async function sendPaymentFailedEmail({ to }: { to: string }) {
  const html = brandFrame({
    heading: "Payment failed.",
    body: `
      <p>We couldn't charge your card for this month's subscription. Your access continues for a few more days while we retry — but you'll need to update your payment method to avoid interruption.</p>
    `,
    ctaText: "Update payment method →",
    ctaUrl: `${APP_URL}/settings`,
  });
  const text = `Your Folio payment failed.\n\nUpdate your payment method: ${APP_URL}/settings`;
  return sendEmail({ to, subject: "Your Folio payment failed.", html, text });
}

export async function sendStudentVerifiedEmail({ to }: { to: string }) {
  const html = brandFrame({
    heading: "You're verified.",
    body: `
      <p>Your student status is confirmed. The Basic tier at $49 for 90 days is now available when you upgrade.</p>
      <p>Verification stays active for one year, then automatically re-verifies.</p>
    `,
    ctaText: "Pick your plan →",
    ctaUrl: `${APP_URL}/pricing`,
  });
  const text = `You're verified as a student. The Basic tier at $49 for 90 days is now available.\n\n${APP_URL}/pricing`;
  return sendEmail({ to, subject: "Student status confirmed.", html, text });
}
