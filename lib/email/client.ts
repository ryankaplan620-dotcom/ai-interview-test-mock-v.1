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

export async function sendWelcomeEmail({ to }: { to: string }) {
  const html = brandFrame({
    heading: "Welcome to",
    headingItalic: "Folio.",
    body: `
      <p>Your 15-day free trial is live.</p>
      <p>You have full access to your plan's features. Practice interviews with all five recruiter personas, drills, and feedback on every session.</p>
      <p>Start practicing anytime. The interview before the interview is already here.</p>
    `,
    ctaText: "Start your first session →",
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io"}/dashboard`,
  });
  const text = `Welcome to Folio.\n\nYour 15-day free trial is live. Full access to your plan's features — practice interviews with all five recruiter personas, drills, and feedback on every session.\n\nStart here: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io"}/dashboard\n\n— Built to get you hired.\nfolio.io`;
  return sendEmail({ to, subject: "Your Folio trial is live.", html, text });
}

export async function sendTrialEndingEmail({ to, daysLeft }: { to: string; daysLeft: number }) {
  const html = brandFrame({
    heading: `Your trial ends in ${daysLeft} days.`,
    body: `
      <p>Pick a plan and keep practicing.</p>
      <p>Cycle is $49 for 90 days (students only). Pro is $149 for a full year with firm calibration. Max is $249 for panels, superdays, hard mode, and priority feedback.</p>
    `,
    ctaText: "Pick a plan →",
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io"}/pricing`,
  });
  const text = `Your Folio trial ends in ${daysLeft} days.\n\nPick a plan: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io"}/pricing\n\n— Built to get you hired.`;
  return sendEmail({ to, subject: `Your Folio trial ends in ${daysLeft} days.`, html, text });
}

export async function sendPaymentFailedEmail({ to }: { to: string }) {
  const html = brandFrame({
    heading: "Payment failed.",
    body: `
      <p>We couldn't charge your card for this month's subscription. Your access continues for a few more days while we retry — but you'll need to update your payment method to avoid interruption.</p>
    `,
    ctaText: "Update payment method →",
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io"}/settings`,
  });
  const text = `Your Folio payment failed.\n\nUpdate your payment method: ${process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io"}/settings`;
  return sendEmail({ to, subject: "Your Folio payment failed.", html, text });
}

export async function sendStudentVerifiedEmail({ to }: { to: string }) {
  const html = brandFrame({
    heading: "You're verified.",
    body: `
      <p>Your student status is confirmed. The Cycle tier at $49 for 90 days is now available when you upgrade.</p>
      <p>Verification stays active for one year, then automatically re-verifies.</p>
    `,
    ctaText: "Pick your plan →",
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io"}/pricing`,
  });
  const text = `You're verified as a student. The Cycle tier at $49 for 90 days is now available.\n\n${process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io"}/pricing`;
  return sendEmail({ to, subject: "Student status confirmed.", html, text });
}
