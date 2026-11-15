/**
 * Browser-only editing helpers over the one renderer: the click-on-the-page
 * overlay and the dotted-path edit rules. Import `@twilda/core/edit.css` for
 * its styles. The Astro site never imports this entry.
 */
export { mountOverlay } from "./overlay";
export type { MediaChoice, OverlayHandle, OverlayOptions } from "./overlay";
export {
  applyEdit,
  changedRefs,
  fieldLabel,
  getAtPath,
  normalizeMultiline,
  normalizeText,
} from "./doc-path";
export type { ApplyEditOptions, EditResult } from "./doc-path";
export {
  MAX_SOURCE_BYTES,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_EDGE,
  VIDEO_HELP,
  applyImageChoice,
  applyVideoChoice,
  describeVideo,
  fitWithin,
  isRepoMedia,
  mediaFileName,
  prepareImage,
  sniffImage,
  toBase64,
} from "./media";
export type { PreparedImage } from "./media";
