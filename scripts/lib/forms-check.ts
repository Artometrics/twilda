import path from "node:path";
import { formEndpointOrigin, loadContentTreeFrom, siteCsp, type SiteSettings } from "./forms-io";

/**
 * Checks that tie a site's form sections to its form setting and to the policy it is served with.
 * Pure over a content folder, so a script, a test, and a starter can all call it.
 */

export interface FormsReport {
  errors: string[];
  warnings: string[];
  /** The Content-Security-Policy this site should be served with, or null when `site.json` cannot be read. */
  csp: string | null;
  site: SiteSettings | null;
  formSections: string[];
}

const PLACEHOLDER_HOST = /(?:^|\.)example\.(?:com|org|net)$/i;

export function checkForms(contentDir: string): FormsReport {
  const report: FormsReport = { errors: [], warnings: [], csp: null, site: null, formSections: [] };
  let loaded;
  try {
    loaded = loadContentTreeFrom(contentDir);
  } catch (error) {
    report.errors.push(`content could not be read: ${(error as Error).message}`);
    return report;
  }
  const { site, pages } = loaded;
  report.site = site;
  for (const page of pages) {
    for (const section of page.sections) if (section.type === "form") report.formSections.push(`${page.id}#${section.id}`);
  }
  const used = report.formSections.length > 0;
  if (used && !site.forms) {
    report.errors.push(`${report.formSections.join(", ")}: a published form needs "forms": { "endpoint": "https://..." } in ${path.join(contentDir, "site.json")}. Without it the form prints inert and cannot send.`);
  }
  if (!used && site.forms) {
    report.warnings.push('site.json has "forms" but no published page has a form section. The policy is opened to the form address for nothing; remove "forms" to keep it shut.');
  }
  if (site.forms) {
    const origin = formEndpointOrigin(site.forms.endpoint);
    if (!origin) report.errors.push("forms.endpoint is not a valid https:// address.");
    else if (PLACEHOLDER_HOST.test(new URL(origin).hostname)) {
      report.warnings.push(`forms.endpoint (${site.forms.endpoint}) is the starter's placeholder. Replace it with the address your form service gave you before you launch.`);
    }
    if (site.forms.format === "json" && site.forms.mode === "post") report.errors.push('forms.format "json" needs mode "fetch".');
  }
  try {
    report.csp = siteCsp(used ? site : { ...site, forms: undefined });
  } catch (error) {
    report.errors.push((error as Error).message);
  }
  return report;
}
