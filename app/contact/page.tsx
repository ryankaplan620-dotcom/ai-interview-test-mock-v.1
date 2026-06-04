import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Section, Container, Eyebrow, SectionHeading, Lede } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Folio — general questions, product support, security, privacy, careers, and press.",
  alternates: { canonical: "/contact" },
};

type Channel = {
  title: string;
  description: string;
  email: string;
  icon: React.ReactNode;
};

const channels: Channel[] = [
  {
    title: "General",
    description: "Questions about Folio, partnerships, or anything else.",
    email: "hello@folio.io",
    icon: (
      <path d="M4 7h16v10H4zM4 8l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Product support",
    description: "Trouble with a session, your account, or billing.",
    email: "support@folio.io",
    icon: (
      <>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.7.25-1.2.9-1.2 1.6M12 16.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Security",
    description: "Report a vulnerability or ask about our practices.",
    email: "security@folio.io",
    icon: (
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Privacy",
    description: "Data requests, deletion, or privacy questions.",
    email: "privacy@folio.io",
    icon: (
      <>
        <rect x="5" y="10" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Careers",
    description: "Open roles and anything about working at Folio.",
    email: "careers@folio.io",
    icon: (
      <>
        <rect x="4" y="7" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Press",
    description: "Media inquiries and brand assets.",
    email: "press@folio.io",
    icon: (
      <>
        <path d="M5 5h11v14H6a2 2 0 0 1-2-2V6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M16 9h3v8a2 2 0 0 1-2 2M8 9h5M8 12h5M8 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-brand-wash" aria-hidden />
        <Container className="py-20 text-center sm:py-24 lg:py-28">
          <ScrollReveal>
            <Eyebrow>Contact</Eyebrow>
            <SectionHeading as="h1" className="mt-5">
              Get in touch.
            </SectionHeading>
            <Lede className="mx-auto mt-6 max-w-[540px]">
              Pick the right inbox below and we'll route it to the right person. We aim to reply
              within one business day.
            </Lede>
          </ScrollReveal>
        </Container>
      </section>

      {/* Channels */}
      <Section tone="white" className="pt-2 sm:pt-4 lg:pt-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((c, i) => (
            <ScrollReveal key={c.title} delay={i * 60}>
              <a
                href={`mailto:${c.email}`}
                className="group flex h-full flex-col rounded-2xl border border-gray-200/70 bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                    {c.icon}
                  </svg>
                </span>
                <h3 className="mt-5 text-[18px] font-semibold text-gray-900">{c.title}</h3>
                <p className="mt-2 flex-1 text-[14px] leading-relaxed text-gray-600">{c.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand-700">
                  {c.email}
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
                    <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </a>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      <Footer />
    </main>
  );
}
