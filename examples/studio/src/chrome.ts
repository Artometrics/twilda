import type { SiteChrome } from "@twilda/core";

/** Masthead for the browser-demo sample site. */
export const chrome: SiteChrome = {
  name: "Twilda studio",
  issueLabel: "Sample site",
  note: "Sample pages and articles built with Twilda CMS. Not a live publication.",
  nav: [
    { label: "Home", href: "/" },
    { label: "Arts", href: "/topics/arts" },
    { label: "Sports", href: "/topics/sports" },
  ],
  colophon: "Sample content for the Twilda phone demo.",
};
