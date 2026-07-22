import type { Metadata } from "next";
import {
  COMPANY,
  LEGAL_VERSIONS,
  PROCESSORS,
  formatEffectiveDate,
} from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Privacy Policy · PrepSpace",
  description: "How PrepSpace collects, uses, shares, and protects your data.",
};

export default function PrivacyPage() {
  const effective = formatEffectiveDate();
  return (
    <article className="relative mx-auto max-w-[720px] px-6 py-16 sm:px-10 sm:py-20">
      <header className="mb-12">
        <p className="font-mono text-[11px] font-medium tracking-label text-brand-700">PRIVACY POLICY</p>
        <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.1] tracking-heading text-gray-900 sm:text-[48px]">
          Privacy Policy
        </h1>
        <p className="mt-4 font-sans text-[13px] text-gray-400">
          Version {LEGAL_VERSIONS.privacy} · Effective {effective}
        </p>
        <p className="mt-6 font-serif text-[17px] italic leading-[1.55] text-gray-600">
          This policy explains what data {COMPANY.short_name} collects, how we use it, who we share
          it with, how long we keep it, and how you control it. We wrote it to be readable. If
          anything is unclear, email us at{" "}
          <a href={`mailto:${COMPANY.privacy_email}`} className="text-brand-700 hover:underline">
            {COMPANY.privacy_email}
          </a>
          .
        </p>
      </header>

      <div className="legal-prose text-gray-600">
        <Section n="1" title="What we collect">
          <p>We collect the following categories of information:</p>
          <ul>
            <li>
              <strong>Account information.</strong> When you sign up, we collect your email address
              and (optionally) your name. If you connect a social login, we receive whatever the
              provider shares (typically email, name, profile picture URL).
            </li>
            <li>
              <strong>Profile information.</strong> Target firms, target role, target year,
              preferred interview type, time zone. You provide this; you can change or remove it at
              any time.
            </li>
            <li>
              <strong>Session content.</strong> During each practice session we collect real-time
              audio and video, produce transcripts from that audio, and record metadata about the
              session (persona, difficulty, duration, completion status). Transcripts are stored;
              raw audio and video are handled per Tavus's policy (see below).
            </li>
            <li>
              <strong>Feedback content.</strong> The scores, summaries, quotes, and improvements
              generated after each session. Plus the memory notes the interviewer "takes" about
              you, and the Q&A evaluation if your session had a Q&A section.
            </li>
            <li>
              <strong>Billing information.</strong> Name, billing address, and payment method
              details are collected and stored by Stripe — we do not store full card numbers. We
              keep your Stripe customer ID, subscription tier, cycle dates, and session-count
              usage.
            </li>
            <li>
              <strong>Student verification.</strong> If you claim the discounted Basic tier, you
              complete verification through SheerID. We receive a verification outcome
              (verified/rejected) and your program ID; we do not receive scans of your documents.
            </li>
            <li>
              <strong>Device and usage data.</strong> IP address, browser type, operating system,
              and technical details required to deliver the service. If you accept analytics
              cookies, we collect feature-usage events through PostHog.
            </li>
          </ul>
        </Section>

        <Section n="2" title="How we use it">
          <p>We use your data only for the following purposes:</p>
          <ul>
            <li>
              <strong>Delivering the service.</strong> Running practice sessions, generating
              feedback, maintaining your session history, surfacing prior-session memory notes to
              the matching persona on subsequent sessions.
            </li>
            <li>
              <strong>Billing and account management.</strong> Charging you per your plan, sending
              receipts, renewal reminders, and trial-ending notices.
            </li>
            <li>
              <strong>Support and communication.</strong> Responding to your questions and sending
              service-related emails (account verification, security notices, material policy
              changes).
            </li>
            <li>
              <strong>Product improvement.</strong> Aggregated, de-identified analytics on feature
              usage and session completion — only if you've accepted analytics cookies. We do{" "}
              <strong>not</strong> use your session transcripts, feedback, or memory notes to
              train AI models, and our agreements with Anthropic prohibit Anthropic from doing so
              either.
            </li>
            <li>
              <strong>Legal and safety.</strong> To comply with lawful requests, enforce our Terms,
              detect fraud or abuse, and protect the rights and safety of our users and our
              business.
            </li>
          </ul>
        </Section>

        <Section n="3" title="Third-party processors and what they see">
          <p>
            We rely on third-party services to run {COMPANY.short_name}. Each processor sees only
            the data it needs for its role. This table is kept current — updated with the Version
            number above whenever we add or remove a processor.
          </p>
          <div className="my-6 space-y-5">
            {PROCESSORS.map((p) => (
              <ProcessorCard key={p.name} processor={p} />
            ))}
          </div>
        </Section>

        <Section n="4" title="How long we keep it">
          <p>
            <strong>Account data and session history.</strong> Retained for the life of your account.
            When you delete your account, we delete your account record and all associated
            transcripts, feedback, memory notes, and session metadata within 30 days. Certain
            information (billing records, fraud-related evidence) may be retained longer where
            legally required.
          </p>
          <p>
            <strong>Third-party retention.</strong> Some processors retain copies independently.
            Specifically: Tavus retains session recordings per their policy; Stripe retains
            transaction records for roughly 7 years per financial-regulation requirements; SheerID
            retains verification outcomes per their policy. You can request deletion from these
            processors directly, or through us — we will pass the request through and confirm
            completion when we receive it.
          </p>
          <p>
            <strong>Rate-limit data.</strong> Upstash Redis stores short-lived counters of your
            request timestamps on the protected endpoints. These expire automatically within 48
            hours.
          </p>
        </Section>

        <Section n="5" title="Your rights and how to exercise them">
          <p>
            You have the following rights with respect to your personal data. To exercise any of
            these, email{" "}
            <a href={`mailto:${COMPANY.privacy_email}`} className="text-brand-700 hover:underline">
              {COMPANY.privacy_email}
            </a>{" "}
            from the address associated with your account.
          </p>
          <ul>
            <li>
              <strong>Access.</strong> Request a copy of the personal data we hold about you. We
              will respond within 30 days.
            </li>
            <li>
              <strong>Correction.</strong> Update or correct inaccurate data. Most profile fields
              can be edited directly in your account settings.
            </li>
            <li>
              <strong>Deletion.</strong> Request deletion of your account and associated data. You
              can also delete your account directly from settings.
            </li>
            <li>
              <strong>Portability.</strong> Request your data in a machine-readable format (JSON).
            </li>
            <li>
              <strong>Restriction.</strong> Ask us to limit how we process your data (for example,
              pausing your account while a dispute is resolved).
            </li>
            <li>
              <strong>Objection.</strong> Object to specific processing, including marketing-related
              processing. We currently do not send marketing emails.
            </li>
            <li>
              <strong>Withdrawal of consent.</strong> Where we rely on your consent, you can
              withdraw it at any time. Withdrawal does not affect processing already completed.
            </li>
          </ul>
          <p>
            <strong>California residents:</strong> you have the same rights above under the
            California Consumer Privacy Act (CCPA / CPRA), plus the right to opt out of any sale or
            sharing of your personal information. We do not sell or share your personal information
            for advertising purposes.
          </p>
          <p>
            <strong>EEA, UK, and Swiss residents:</strong> you have the same rights above under the
            GDPR (and equivalent UK and Swiss laws), plus the right to lodge a complaint with your
            local data protection authority.
          </p>
        </Section>

        <Section n="6" title="Student data (SheerID and the Basic tier)">
          <p>
            If you claim the Basic tier, SheerID verifies your student status. SheerID may ask for
            documentation (enrollment verification, transcript, .edu email, or similar). SheerID
            processes that documentation on its own infrastructure under its own privacy policy. We
            receive only the outcome — verified, rejected, or pending — plus a reference ID. We do
            not store the documents you provided to SheerID.
          </p>
          <p>
            If you are a minor (under 18 in most U.S. states, or under 16 in some jurisdictions),
            you must use {COMPANY.short_name} only with the consent and supervision of a parent or
            legal guardian as described in our Terms. We do not knowingly collect data from
            children under 13. If you believe we have, contact us immediately at{" "}
            <a href={`mailto:${COMPANY.privacy_email}`} className="text-brand-700 hover:underline">
              {COMPANY.privacy_email}
            </a>
            .
          </p>
        </Section>

        <Section n="7" title="International transfers">
          <p>
            {COMPANY.short_name} operates from the United States. Our processors are also primarily
            located in the United States. If you access the service from outside the United States,
            your data will be transferred to and processed in the United States. For users in the
            EEA, UK, or Switzerland, we rely on the European Commission's Standard Contractual
            Clauses (or equivalent mechanisms) with our subprocessors where required.
          </p>
        </Section>

        <Section n="8" title="Security">
          <p>
            We take reasonable precautions to protect your data, including encryption in transit
            (HTTPS), access controls on our databases, and regular security review of our
            third-party processors. No security measure is perfect. If we become aware of a
            security incident that materially affects your data, we will notify you and any
            regulators required by applicable law, within legally required timeframes.
          </p>
        </Section>

        <Section n="9" title="Automated decision-making">
          <p>
            {COMPANY.short_name} uses AI models (primarily Anthropic's Claude) to generate your
            feedback, score your Q&A section, and write the per-persona memory notes. These
            outputs are produced automatically without human review. The outputs affect your
            experience within {COMPANY.short_name} — they determine your scores and what the
            interviewer references in future sessions. They do not have legal or similarly
            significant effects outside the product. If you want a human review of a specific
            feedback result, email{" "}
            <a href={`mailto:${COMPANY.privacy_email}`} className="text-brand-700 hover:underline">
              {COMPANY.privacy_email}
            </a>
            .
          </p>
        </Section>

        <Section n="10" title="Cookies and tracking">
          <p>
            We use a minimum set of cookies required to operate the product (authentication session,
            rate-limit counters). We do not place analytics or advertising cookies without your
            explicit consent. See our{" "}
            <a href="/legal/cookies" className="text-brand-700 hover:underline">
              Cookie Policy
            </a>{" "}
            for details.
          </p>
        </Section>

        <Section n="11" title="Changes to this policy">
          <p>
            When we materially change this policy, we will update the Version and Effective Date
            above and notify account-holding users by email at least 14 days before the change
            takes effect. Continued use after the Effective Date constitutes acceptance of the
            updated policy.
          </p>
        </Section>

        <Section n="12" title="Contact">
          <p>
            For any privacy-related question or to exercise any of the rights above, write to{" "}
            <a href={`mailto:${COMPANY.privacy_email}`} className="text-brand-700 hover:underline">
              {COMPANY.privacy_email}
            </a>
            . For general product support, write to{" "}
            <a href={`mailto:${COMPANY.support_email}`} className="text-brand-700 hover:underline">
              {COMPANY.support_email}
            </a>
            . For legal notices, write to{" "}
            <a href={`mailto:${COMPANY.legal_email}`} className="text-brand-700 hover:underline">
              {COMPANY.legal_email}
            </a>
            .
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-[22px] font-semibold leading-[1.2] text-gray-900">
        <span className="mr-3 font-mono text-[14px] font-normal text-gray-400">{n}.</span>
        {title}
      </h2>
      <div className="font-sans text-[15px] leading-[1.7] [&>p]:mb-4 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_ul]:my-4 [&_ul]:space-y-3 [&_li]:pl-5 [&_li]:relative [&_li]:before:content-['—'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-brand-700">
        {children}
      </div>
    </section>
  );
}

function ProcessorCard({
  processor,
}: {
  processor: (typeof PROCESSORS)[number];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[16px] font-semibold text-gray-900">{processor.name}</h3>
        <span className="font-mono text-[10px] tracking-label text-gray-400">
          {processor.jurisdiction.toUpperCase()}
        </span>
      </div>
      <p className="mt-2 font-sans text-[13.5px] leading-[1.55] text-gray-600">
        {processor.role}.
      </p>
      <p className="mt-3 font-sans text-[12.5px] leading-[1.55] text-gray-400">
        <span className="font-medium text-gray-600">Data categories: </span>
        {processor.data_categories.join(", ")}.
      </p>
      <p className="mt-2 font-sans text-[12.5px] leading-[1.55] text-gray-400">
        <span className="font-medium text-gray-600">Retention: </span>
        {processor.retention_note}
      </p>
      <a
        href={processor.privacy_policy_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block font-mono text-[11px] tracking-label text-brand-700 hover:underline"
      >
        {processor.name.toUpperCase()} PRIVACY POLICY →
      </a>
    </div>
  );
}
