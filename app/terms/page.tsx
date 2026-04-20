import { LegalShell } from "@/components/LegalShell";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="April 2026">
      <h2>Acceptance</h2>
      <p>By using Folio, you agree to these terms. If you don&apos;t agree, don&apos;t use the service.</p>

      <h2>What Folio is</h2>
      <p>
        Folio provides hyper-realistic video interview practice. You record yourself, receive feedback, and
        practice as many times as you like within the limits of your subscription tier.
      </p>

      <h2>Subscription and billing</h2>
      <p>
        Subscriptions renew automatically until you cancel. You can cancel any time through the Customer Portal
        in Settings. Refunds on annual plans are prorated.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Reverse engineer, scrape, or misuse the platform.</li>
        <li>Share your account credentials with others.</li>
        <li>Use Folio to harass, discriminate, or harm others.</li>
        <li>Upload content you don&apos;t have rights to.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain ownership of your interview recordings, transcripts, and personal data. Folio has a limited
        license to process this data solely to operate the service for you.
      </p>

      <h2>Disclaimers</h2>
      <p>
        Folio helps you prepare, but it doesn&apos;t guarantee any job outcome. Interview success depends on many
        factors outside our control.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href="mailto:legal@folio.io">legal@folio.io</a>.
      </p>

      <p className="mt-12 text-text-tertiary">
        This is a placeholder document. Consult a lawyer before launch.
      </p>
    </LegalShell>
  );
}
