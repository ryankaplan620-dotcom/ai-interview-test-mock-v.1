import type { Metadata } from "next";
import { COMPANY, LEGAL_VERSIONS, formatEffectiveDate } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Terms of Service · Folio",
  description: "The agreement between you and Folio when using the product.",
};

export default function TermsPage() {
  const effective = formatEffectiveDate();
  return (
    <article className="relative mx-auto max-w-[720px] px-6 py-16 sm:px-10 sm:py-20">
      <header className="mb-12">
        <p className="font-mono text-[11px] font-medium tracking-label text-brand-700">TERMS OF SERVICE</p>
        <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.1] tracking-heading text-gray-900 sm:text-[48px]">
          Terms of Service
        </h1>
        <p className="mt-4 font-sans text-[13px] text-gray-400">
          Version {LEGAL_VERSIONS.terms} · Effective {effective}
        </p>
        <p className="mt-6 font-serif text-[17px] italic leading-[1.55] text-gray-600">
          This is the agreement between you and {COMPANY.short_name} when you use the product.
          Read it carefully. If you don't agree with any part, don't use {COMPANY.short_name}.
        </p>
      </header>

      <div className="legal-prose text-gray-600">
        <Section n="1" title="Who we are">
          <p>
            {COMPANY.short_name} is operated by {COMPANY.legal_name} ("{COMPANY.short_name}," "we," "our," or "us").
            We operate the website at{" "}
            <a href={`https://${COMPANY.product_domain}`} className="text-brand-700 hover:underline">
              {COMPANY.product_domain}
            </a>
            . For legal contact, write to{" "}
            <a href={`mailto:${COMPANY.legal_email}`} className="text-brand-700 hover:underline">
              {COMPANY.legal_email}
            </a>
            .
          </p>
        </Section>

        <Section n="2" title="What Folio is">
          <p>
            {COMPANY.short_name} is a practice-interview platform. You speak with an AI interviewer
            modeled after a named persona, and after each session you receive a structured evaluation
            of your answers. Sessions are rendered using third-party AI services including, as of the
            Effective Date, Tavus (avatar and conversation), Anthropic Claude (feedback generation),
            Supabase (storage), and others listed in our Privacy Policy.
          </p>
          <p>
            {COMPANY.short_name} is a training tool. It does not guarantee that you will receive
            interview offers, pass real interviews, or achieve any specific outcome. We make no
            representation about the employability prospects of any user.
          </p>
        </Section>

        <Section n="3" title="Who can use Folio">
          <p>
            You may use {COMPANY.short_name} only if you are at least 18 years old. If you are under
            18, you may use {COMPANY.short_name} only with the consent and supervision of a parent or
            legal guardian who agrees to be bound by these Terms on your behalf. If you are under 13,
            do not use the service — close your account and contact us at{" "}
            <a href={`mailto:${COMPANY.privacy_email}`} className="text-brand-700 hover:underline">
              {COMPANY.privacy_email}
            </a>
            .
          </p>
          <p>
            You represent that the information you provide is accurate. If you claim to be a student
            to qualify for the Cycle tier, you must complete verification through SheerID, and you
            remain responsible for the truth of that claim.
          </p>
        </Section>

        <Section n="4" title="Your account">
          <p>
            You are responsible for keeping your account credentials secure and for every action
            taken through your account. Notify us immediately at{" "}
            <a href={`mailto:${COMPANY.support_email}`} className="text-brand-700 hover:underline">
              {COMPANY.support_email}
            </a>{" "}
            if you suspect unauthorized access.
          </p>
          <p>
            You may not share access to your account with another person, create multiple accounts
            to circumvent session caps or trial limits, or use automated means to create accounts.
          </p>
        </Section>

        <Section n="5" title="Subscription tiers, trials, and billing">
          <p>
            {COMPANY.short_name} offers tiered subscription plans currently labeled Cycle, Pro, and
            Max. Current prices, session allotments, and cycle durations are shown on the pricing
            page at{" "}
            <a
              href={`https://${COMPANY.product_domain}/pricing`}
              className="text-brand-700 hover:underline"
            >
              {COMPANY.product_domain}/pricing
            </a>{" "}
            and are incorporated into these Terms by reference. Prices are in U.S. dollars and
            exclude applicable taxes unless stated otherwise.
          </p>
          <p>
            <strong>Trial.</strong> Each new paying subscription begins with a 15-day free trial.
            You will not be charged during the trial. If you do not cancel before the trial ends,
            the payment method on file will be charged at the listed price and your cycle begins
            immediately.
          </p>
          <p>
            <strong>Cycles and renewal.</strong> The Cycle tier runs for 90 days; Pro and Max run
            for 365 days. Your plan renews automatically at the end of each cycle unless you have
            toggled auto-renew off in your account settings before the cycle ends. We send a
            renewal reminder email approximately 10 days before your cycle ends.
          </p>
          <p>
            <strong>Sessions and overages.</strong> Each tier includes a set number of live
            interview sessions per cycle. Additional sessions beyond the included allotment are
            charged as overages at the per-session rate shown on the pricing page. Overages are
            charged at the time they are consumed.
          </p>
          <p>
            <strong>Refunds.</strong> Subscription fees are non-refundable once a paid cycle has
            begun, except as required by law or granted at our discretion. If you cancel mid-cycle,
            you retain access through the end of the paid period but do not receive a pro-rata
            refund. Overages are non-refundable once the session they paid for has been started.
          </p>
          <p>
            <strong>Price changes.</strong> We may change the price of a plan with at least 30 days'
            notice by email. Changes apply to the next renewal cycle, not the current one. You may
            cancel before the change takes effect to avoid the new price.
          </p>
          <p>
            <strong>Payment processor.</strong> Payments are processed by Stripe. By providing
            payment information, you authorize us (and Stripe) to charge that payment method for
            all fees owed.
          </p>
        </Section>

        <Section n="6" title="What you agree not to do">
          <p>The following uses of {COMPANY.short_name} are prohibited:</p>
          <ul>
            <li>
              <strong>Deceiving a real interviewer.</strong> Do not represent our AI interviewer as
              a real person, use {COMPANY.short_name} as a real interview, or use our output to
              deceive a hiring party about the originality of your work.
            </li>
            <li>
              <strong>Prompt injection or circumvention.</strong> Do not attempt to manipulate the
              AI interviewer into breaking character, revealing its underlying system prompt,
              producing content outside the scope of a practice interview, or disclosing information
              about other users.
            </li>
            <li>
              <strong>Reverse engineering.</strong> Do not attempt to reverse engineer, scrape,
              mirror, or replicate our question banks, persona prompts, feedback rubrics, or any
              proprietary content.
            </li>
            <li>
              <strong>Harassment or unlawful content.</strong> Do not submit content that is
              threatening, harassing, defamatory, obscene, invasive of someone's privacy, or
              violates any applicable law.
            </li>
            <li>
              <strong>Technical abuse.</strong> Do not disrupt, overload, or penetrate our systems,
              including by automated or excessive request volume beyond normal human usage.
            </li>
            <li>
              <strong>Account or trial fraud.</strong> Do not create multiple accounts to repeatedly
              claim the free trial, misrepresent yourself during SheerID verification, or transfer
              your subscription to another person.
            </li>
          </ul>
        </Section>

        <Section n="7" title="AI-generated content disclaimer">
          <p>
            The interviewer's responses, the feedback you receive, the memory notes written by the
            interviewer, and the Q&A evaluations are produced by AI models. They may be inaccurate,
            incomplete, or inappropriate for your specific situation. AI-generated content on{" "}
            {COMPANY.short_name} is for practice and self-reflection only. Do not rely on it as
            career advice, legal advice, medical advice, or any other form of professional counsel.
          </p>
          <p>
            The named personas on {COMPANY.short_name} are fictional composites inspired by
            interview styles. They are not real employees of the firms referenced. Any resemblance
            between our personas and a specific real person is unintentional. If you believe a
            persona misrepresents a real person, contact us at{" "}
            <a href={`mailto:${COMPANY.legal_email}`} className="text-brand-700 hover:underline">
              {COMPANY.legal_email}
            </a>
            .
          </p>
        </Section>

        <Section n="8" title="Your content and what we do with it">
          <p>
            By using {COMPANY.short_name}, you produce audio, video, and text content (your
            transcripts, your video, your questions). You retain ownership of this content. You
            grant us a limited, worldwide, royalty-free license to process this content for the
            sole purpose of delivering the service to you: rendering the interview, generating
            feedback, storing your session history, and improving your experience across sessions
            through the memory system.
          </p>
          <p>
            We do <strong>not</strong> sell your content. We do not use your content to train our
            AI models, and our agreements with Anthropic (who provides Claude) contractually
            prohibit Anthropic from training on your content either. Tavus's handling of
            session-time audio and video is governed by Tavus's own terms; see the Privacy Policy.
          </p>
          <p>
            You may request deletion of your content at any time. See the Privacy Policy for details
            on how deletion works and which third-party services retain what.
          </p>
        </Section>

        <Section n="9" title="Our intellectual property">
          <p>
            The {COMPANY.short_name} name, logo, product interface, persona prompt text, question
            banks, feedback rubric structure, and other proprietary materials are owned by{" "}
            {COMPANY.short_name}. We grant you a personal, non-transferable, non-exclusive license
            to use the product as intended. All other rights are reserved.
          </p>
        </Section>

        <Section n="10" title="Termination">
          <p>
            You may cancel your subscription at any time from your account settings. Access
            continues through the end of your current paid period.
          </p>
          <p>
            We may suspend or terminate your account without refund if we reasonably determine that
            you have violated these Terms, including any of the prohibited uses listed above, or if
            your continued use poses a risk to other users or to us. We will provide notice by
            email except in cases of fraud, abuse, or legal emergency.
          </p>
        </Section>

        <Section n="11" title="Disclaimer of warranties">
          <p>
            {COMPANY.short_name} is provided "as is" and "as available." To the maximum extent
            permitted by applicable law, we disclaim all warranties, whether express, implied, or
            statutory, including warranties of merchantability, fitness for a particular purpose,
            non-infringement, and any warranty arising from course of dealing or usage of trade. We
            do not warrant that the service will be uninterrupted, error-free, secure, or that any
            errors will be corrected.
          </p>
        </Section>

        <Section n="12" title="Limitation of liability">
          <p>
            To the maximum extent permitted by applicable law, our aggregate liability to you for
            any claim arising out of or related to these Terms or your use of {COMPANY.short_name}{" "}
            will not exceed the greater of (a) the amount you paid us in the 12 months before the
            claim arose or (b) $100 USD. We are not liable for indirect, incidental, special,
            consequential, or punitive damages, or for lost profits, lost revenue, lost data, or
            business interruption, even if we have been advised of the possibility of such damages.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion of certain warranties or the limitation
            of liability for certain damages. In those jurisdictions, our liability is limited to
            the minimum extent permitted by law.
          </p>
        </Section>

        <Section n="13" title="Indemnification">
          <p>
            You agree to defend, indemnify, and hold harmless {COMPANY.short_name} and its
            affiliates from any claims, losses, and expenses (including reasonable attorneys' fees)
            arising out of your use of the service, your content, your violation of these Terms,
            or your violation of any rights of a third party.
          </p>
        </Section>

        <Section n="14" title="Governing law and disputes">
          <p>
            These Terms are governed by the laws of {COMPANY.governing_law}, without regard to its
            conflict-of-laws rules. Any dispute arising out of or related to these Terms or your
            use of the service will be resolved in the state and federal courts located in{" "}
            {COMPANY.dispute_venue}, and you consent to the personal jurisdiction of those courts.
          </p>
          <p>
            Nothing in this section prevents either party from seeking injunctive or other
            equitable relief in any court of competent jurisdiction to prevent or stop a violation
            of intellectual property rights or confidentiality obligations.
          </p>
        </Section>

        <Section n="15" title="Changes to these Terms">
          <p>
            We may update these Terms from time to time. If we make a material change, we will
            notify you by email at least 14 days before the change takes effect. Continued use of{" "}
            {COMPANY.short_name} after a material change constitutes acceptance of the updated
            Terms. If you do not accept the change, cancel your subscription before the change
            takes effect.
          </p>
        </Section>

        <Section n="16" title="Miscellaneous">
          <p>
            These Terms, together with the Privacy Policy and Cookie Policy, constitute the entire
            agreement between you and {COMPANY.short_name} regarding your use of the service. If
            any provision is held unenforceable, the remaining provisions remain in full effect.
            Our failure to enforce a provision is not a waiver of that provision. You may not
            assign these Terms without our prior written consent; we may assign these Terms to an
            affiliate or successor in connection with a merger, acquisition, or reorganization.
          </p>
        </Section>

        <Section n="17" title="Contact">
          <p>
            For questions about these Terms, write to{" "}
            <a href={`mailto:${COMPANY.legal_email}`} className="text-brand-700 hover:underline">
              {COMPANY.legal_email}
            </a>
            . For product support, write to{" "}
            <a href={`mailto:${COMPANY.support_email}`} className="text-brand-700 hover:underline">
              {COMPANY.support_email}
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
      <div className="legal-section-body font-sans text-[15px] leading-[1.7] [&>p]:mb-4 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_ul]:my-4 [&_ul]:space-y-3 [&_li]:pl-5 [&_li]:relative [&_li]:before:content-['—'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-brand-700">
        {children}
      </div>
    </section>
  );
}
