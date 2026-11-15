import { formEndpointOrigin, siteCsp, type PageDocument, type SiteSettings } from "@twilda/core";
import { loadContentTree, readSiteFile } from "@twilda/core/node";

export { formEndpointOrigin, siteCsp };
export type { SiteSettings };

/** The published pages and the site settings of one content folder. */
export function loadContentTreeFrom(dir: string): { site: SiteSettings; pages: PageDocument[] } {
  return { site: readSiteFile(dir), pages: loadContentTree(dir).pages };
}
