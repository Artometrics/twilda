/** Shared homepage FAQ copy — keep JSON-LD and visible FAQ in sync. */
export const homepageFaqs = [
  {
    question: "How do I get started?",
    answer:
      "Sign up free, open your library, and explore the classic sample novels we add on first visit—or jump into Atlas and GOTHA.",
  },
  {
    question: "Does Twilda autosave my work?",
    answer:
      "Yes. Scene edits in Write mode save automatically to your account. Export your manuscript as .txt anytime.",
  },
  {
    question: "What is the Codex?",
    answer:
      "The Codex is your story bible—characters, locations, lore, and notes that stay linked to your novel while you draft.",
  },
  {
    question: "What are Atlas and GOTHA?",
    answer:
      "Atlas is a historical map of people, places, ideas, and open-access museum artifacts. GOTHA is personal genealogy—add ancestors and pin their stories on the map.",
  },
  {
    question: "What is My Museum?",
    answer:
      "Save Atlas artifacts (including Met Open Access works) to your account as a private collection you can reopen anytime.",
  },
  {
    question: "How do AI credits work?",
    answer:
      "Free plans include 5 Chat and Review credits per month. Pro and Studio include more. Credits reset each billing cycle. Failed AI calls refund the credit.",
  },
  {
    question: "Can I import an existing draft?",
    answer:
      "Yes. Use Import on your library page to upload plain text. Twilda creates a new novel with your content in the first scene.",
  },
  {
    question: "Is my writing private?",
    answer:
      "Your novels, GOTHA tree, and My Museum are scoped to your account with row-level security in Supabase.",
  },
  {
    question: "Can I export my novel?",
    answer:
      "Yes. Use Export in the workspace sidebar to download a .txt manuscript.",
  },
  {
    question: "How do I upgrade my plan?",
    answer:
      "Choose Pro on the pricing page or open Account → Billing for Stripe checkout. Studio is contact-only custom onboarding.",
  },
] as const;

export function homepageFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homepageFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
