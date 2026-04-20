import { LegalShell } from "@/components/LegalShell";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="April 2026">
      <h2>Overview</h2>
      <p>
        Folio is committed to protecting your privacy. This policy describes what information we collect, how we
        use it, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Account information: name, email address, profile preferences.</li>
        <li>Session data: audio and video recordings of practice interviews, transcripts, feedback.</li>
        <li>Usage data: sessions started, features used, subscription tier, time spent in the product.</li>
        <li>Payment data: handled by Stripe. Folio never sees or stores payment card details.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide and improve the Folio service.</li>
        <li>To generate personalized feedback on your interview performance.</li>
        <li>To communicate with you about your account, subscription, and new features.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>Who we share it with</h2>
      <ul>
        <li>Anthropic, for Claude persona intelligence.</li>
        <li>ElevenLabs, for voice synthesis.</li>
        <li>Simli, for avatar rendering.</li>
        <li>Deepgram, for speech-to-text transcription.</li>
        <li>Stripe, for payment processing.</li>
        <li>Resend, for transactional email.</li>
        <li>PostHog and Sentry, for product analytics and error tracking.</li>
      </ul>
      <p>We never sell your data.</p>

      <h2>Your rights (GDPR / CCPA)</h2>
      <p>
        You can export your data, request deletion, or opt out of processing at any time. Email{" "}
        <a href="mailto:support@folio.io">support@folio.io</a> or use the in-app controls in Settings.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href="mailto:legal@folio.io">legal@folio.io</a>.
      </p>

      <p className="mt-12 text-text-tertiary">
        This is a placeholder policy. Consult a lawyer before launch.
      </p>
    </LegalShell>
  );
}
