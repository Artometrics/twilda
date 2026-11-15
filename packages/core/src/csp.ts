import { formEndpointOrigin } from "./forms";
import type { PageSection } from "./schema";

/**
 * The Content-Security-Policy a Twilda site should be served with.
 *
 * With no form the policy is the locked one in `firebase.json`: no script, no form post, no
 * network call. A site that has a form opens exactly three things, all to one origin or to itself:
 *
 * - `script-src 'self'` for the one small file the form uses (`/twilda-forms.js`), never inline;
 * - `form-action <origin>` so the page's plain form post (and no other) may leave the site;
 * - `connect-src <origin>` so that file may send the same submission with `fetch`. Only in `fetch`
 *   mode; in `post` mode the browser navigates instead and `connect-src` stays `'none'`.
 *
 * `<origin>` is `https://host[:port]` taken from the validated endpoint. There is never a wildcard,
 * a scheme-only source, or `http:`. `tests/csp.test.ts` and `tests/forms-csp.test.ts` pin this.
 */

const STREAMS = "https://www.youtube-nocookie.com https://player.vimeo.com";

export interface CspInput {
  forms?: { endpoint: string; mode?: "fetch" | "post" } | null;
}

/** The origin the policy opens for forms, or null when the site has no valid form endpoint. */
export function formsOrigin(site: CspInput | null | undefined): string | null {
  return site?.forms ? formEndpointOrigin(site.forms.endpoint) : null;
}

/** True when any page of the site prints a form. */
export function usesForms(documents: ReadonlyArray<{ kind: string; sections?: ReadonlyArray<Pick<PageSection, "type">> }>): boolean {
  return documents.some((doc) => doc.kind === "page" && (doc.sections ?? []).some((section) => section.type === "form"));
}

/** The exact `Content-Security-Policy` value for a site. Throws if forms are configured with an endpoint that is not valid. */
export function siteCsp(site?: CspInput | null): string {
  let origin: string | null = null;
  if (site?.forms) {
    origin = formEndpointOrigin(site.forms.endpoint);
    if (!origin) throw new Error("site.forms.endpoint is not a valid https:// form address, so no policy can be built for it.");
  }
  return [
    "default-src 'none'",
    "base-uri 'none'",
    `form-action ${origin ?? "'none'"}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${origin ? "'self'" : "'none'"}`,
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "media-src 'none'",
    `connect-src ${origin && site?.forms?.mode !== "post" ? origin : "'none'"}`,
    "worker-src 'none'",
    "manifest-src 'none'",
    `frame-src ${STREAMS}`,
    "upgrade-insecure-requests",
  ].join("; ");
}
