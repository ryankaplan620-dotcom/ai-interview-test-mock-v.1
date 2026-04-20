import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

// Email validation schema
const WaitlistSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address.")
    .max(255, "Email is too long."),
});

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
const WAITLIST_NOTIFY_EMAIL = process.env.WAITLIST_NOTIFY_EMAIL ?? "hello@folio.io";

/**
 * POST /api/waitlist
 *
 * Adds an email to the waitlist.
 * - If Resend is configured: adds to audience + sends welcome email
 * - If Resend is NOT configured: logs to console (graceful degradation for local dev)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = WaitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid email." },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Graceful degradation — if Resend isn't set up yet, log locally
    if (!RESEND_API_KEY) {
      console.log(`[Waitlist] (no Resend configured) Signup: ${email}`);
      return NextResponse.json({ success: true, dev: true });
    }

    const resend = new Resend(RESEND_API_KEY);

    // 1. Add to Resend audience (if audience ID configured)
    if (RESEND_AUDIENCE_ID) {
      try {
        await resend.contacts.create({
          audienceId: RESEND_AUDIENCE_ID,
          email,
          unsubscribed: false,
        });
      } catch (err) {
        // Contact might already exist — don't fail the whole flow
        console.warn("[Waitlist] Contact creation warning:", err);
      }
    }

    // 2. Send internal notification (optional, helpful during alpha)
    if (WAITLIST_NOTIFY_EMAIL) {
      try {
        await resend.emails.send({
          from: "Folio Waitlist <noreply@folio.io>",
          to: WAITLIST_NOTIFY_EMAIL,
          subject: `New waitlist signup — ${email}`,
          text: `${email} just joined the Folio waitlist.`,
        });
      } catch (err) {
        console.warn("[Waitlist] Notify email warning:", err);
      }
    }

    // 3. Send welcome email to the user
    try {
      await resend.emails.send({
        from: "Folio <hello@folio.io>",
        to: email,
        subject: "You're on the Folio waitlist.",
        html: welcomeEmail(),
        text: welcomeEmailText(),
      });
    } catch (err) {
      // Welcome email failure shouldn't block the signup
      console.warn("[Waitlist] Welcome email warning:", err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Waitlist] Error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

function welcomeEmail() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to Folio</title>
</head>
<body style="margin:0;padding:0;background:#0D1117;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1117;padding:48px 24px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <h1 style="margin:0;color:#F0F6FC;font-size:32px;font-weight:600;letter-spacing:-0.03em;line-height:1.15;">
            The interview<br/>
            <em style="font-family:Georgia,serif;font-weight:400;color:#00F590;">before</em><br/>
            the interview.
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;color:#A8B0BA;font-size:16px;line-height:1.65;">
            You&rsquo;re on the list.
          </p>
          <p style="margin:16px 0 0;color:#A8B0BA;font-size:16px;line-height:1.65;">
            Folio is the practice interview you run the night before the real one. Hyper-realistic video calls
            with recruiter-grade interviewers, calibrated to the specific firm, round, and pressure of the
            interview you&rsquo;re actually preparing for.
          </p>
          <p style="margin:16px 0 0;color:#A8B0BA;font-size:16px;line-height:1.65;">
            We&rsquo;ll email you the day Folio opens to your target firm&rsquo;s interview bank. Your first practice
            session is on us.
          </p>
        </td></tr>
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

function welcomeEmailText() {
  return `The interview before the interview.

You're on the list.

Folio is the practice interview you run the night before the real one. Hyper-realistic video calls with recruiter-grade interviewers, calibrated to the specific firm, round, and pressure of the interview you're actually preparing for.

We'll email you the day Folio opens to your target firm's interview bank. Your first practice session is on us.

— Built to get you hired.
folio.io`;
}
