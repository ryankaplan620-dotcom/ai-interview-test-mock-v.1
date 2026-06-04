import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Section, Container, Eyebrow, SectionHeading, Lede, Button, Card } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Join Folio and help build the thing that gets people hired. Open roles in engineering, ML, marketing, and content.",
};

const values = [
  {
    title: "Voice-first thinking",
    description:
      "Interviews are conversations, not forms. Every feature we build starts with the spoken word and works backward to the interface.",
  },
  {
    title: "Ship then polish",
    description:
      "Get it in front of users fast, learn what matters, then make it great. Perfection in a vacuum helps no one.",
  },
  {
    title: "Outcomes over activity",
    description:
      "We care whether candidates get hired, not how many features we shipped. Every metric ties back to real interview performance.",
  },
];

const roles = [
  { title: "Senior Frontend Engineer", department: "Engineering", location: "Remote" },
  { title: "ML Engineer — Voice", department: "Engineering", location: "Remote" },
  { title: "Growth Marketing Lead", department: "Marketing", location: "Remote" },
  { title: "Content Editor (The Journal)", department: "Content", location: "Remote" },
];

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <Nav />

      {/* Hero */}
      <Section tone="white" className="pt-20 sm:pt-28 lg:pt-32">
        <div className="mx-auto max-w-[760px] text-center">
          <ScrollReveal>
            <Eyebrow>Careers</Eyebrow>
            <SectionHeading as="h1" className="mt-5">
              Build the thing that gets{" "}
              <span className="font-serif font-normal italic text-brand-600">people hired.</span>
            </SectionHeading>
            <Lede className="mx-auto mt-6 max-w-[600px]">
              We are a small team making interview practice feel real. If you care about craft,
              move fast, and want your work to directly change outcomes for people, we want to
              talk.
            </Lede>
          </ScrollReveal>
        </div>
      </Section>

      {/* Values */}
      <Section tone="tint">
        <ScrollReveal>
          <p className="text-center font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            How we work
          </p>
        </ScrollReveal>
        <div className="mx-auto mt-12 grid max-w-[1000px] gap-6 sm:grid-cols-3">
          {values.map((value, i) => (
            <ScrollReveal key={value.title} delay={i * 100}>
              <Card className="h-full p-7">
                <h3 className="text-[18px] font-semibold text-gray-900">{value.title}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-gray-600">{value.description}</p>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Open roles */}
      <Section tone="white">
        <div className="mx-auto max-w-[760px]">
          <ScrollReveal>
            <Eyebrow>Open roles</Eyebrow>
            <SectionHeading className="mt-4">Join the team.</SectionHeading>
          </ScrollReveal>
          <div className="mt-10 space-y-3.5">
            {roles.map((role, i) => (
              <ScrollReveal key={role.title} delay={i * 70}>
                <a
                  href={`mailto:careers@folio.io?subject=Application: ${role.title}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-gray-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <div>
                    <h3 className="text-[16px] font-semibold text-gray-900">{role.title}</h3>
                    <p className="mt-1 text-[13px] text-gray-500">
                      {role.department} · {role.location}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-[14px] font-semibold text-brand-700 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
                    Apply
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </a>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section tone="tint">
        <Container className="text-center">
          <ScrollReveal>
            <SectionHeading>Don&apos;t see your role?</SectionHeading>
            <Lede className="mx-auto mt-5 max-w-[460px]">
              Reach out anyway. We are always looking for people who care about this problem.
            </Lede>
            <div className="mt-9 flex justify-center">
              <Button href="mailto:careers@folio.io" size="lg">
                careers@folio.io
              </Button>
            </div>
          </ScrollReveal>
        </Container>
      </Section>

      <Footer />
    </main>
  );
}
