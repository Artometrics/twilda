import { parseVideoUrl, VIDEO_PROVIDER_LABELS } from "../embed";
import { safeMedia } from "../escape";
import { documentSchema, type TwildaDocument } from "../schema";
import { getAtPath } from "./doc-path";

/**
 * Image and video choices for the editors. A choice is validated twice: here, with
 * rules a person can act on (only repo media, only allowlisted video hosts), and then
 * by the document schema. The static page prints only what passes both.
 */

export const MAX_UPLOAD_EDGE = 1600;
/** Largest file the editor will commit to the repo, after it has been resized and compressed. */
export const MAX_UPLOAD_BYTES = 900_000;
/** Largest file the editor will even try to decode. */
export const MAX_SOURCE_BYTES = 40_000_000;

export interface Fit {
  width: number;
  height: number;
  scaled: boolean;
}

/** Fit an image inside a square of `maxEdge` pixels, preserving aspect ratio. */
export function fitWithin(width: number, height: number, maxEdge: number): Fit {
  if (!(width > 0) || !(height > 0) || !(maxEdge > 0) || !Number.isFinite(width + height + maxEdge)) {
    throw new Error("Image dimensions must be positive.");
  }
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width: Math.round(width), height: Math.round(height), scaled: false };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  };
}

export { sniffImage, type ImageKind } from "../media-guard";
import { sniffImage } from "../media-guard";

/** A repo-safe file name: lowercase letters, digits, and hyphens, never one that is already `taken`. */
export function mediaFileName(original: string, extension: string, taken: Iterable<string> = []): string {
  const used = new Set([...taken].map((name) => name.toLowerCase()));
  const stem =
    original
      .replace(/\.[a-z0-9]{1,5}$/i, "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "image";
  const ext = extension.toLowerCase().replace(/^\./, "");
  let name = `${stem}.${ext}`;
  for (let n = 2; used.has(name) && n < 10_000; n += 1) name = `${stem}-${n}.${ext}`;
  return name;
}

/** `/media/field-notes.jpg` for a file the page can print. */
export function isRepoMedia(src: string): boolean {
  return safeMedia(src) !== null;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export interface PreparedImage {
  /** File name in the repo media folder, e.g. `field-notes.jpg`. */
  name: string;
  /** What the page prints: `/media/field-notes.jpg`. */
  src: string;
  /** Where the file is committed: `public/media/field-notes.jpg`. */
  repoPath: string;
  type: "image/jpeg";
  base64: string;
  dataUrl: string;
  bytes: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalBytes: number;
  scaled: boolean;
}

export interface PrepareOptions {
  maxEdge?: number;
  maxBytes?: number;
  taken?: Iterable<string>;
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close(): void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      /* fall through to an <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("This browser could not compress the image."))), "image/jpeg", quality);
  });
}

/**
 * Resize and compress a picked image on the device, before anything is sent anywhere.
 * The result is always a JPEG: it is re-encoded from decoded pixels, which also removes
 * EXIF data such as GPS position, and a disguised file (a script named `.jpg`) cannot decode, so it is refused.
 * SVG is not accepted for upload.
 */
export async function prepareImage(file: File, options: PrepareOptions = {}): Promise<PreparedImage> {
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;
  if (file.type === "image/svg+xml" || /\.svgz?$/i.test(file.name)) {
    throw new Error("SVG files cannot be uploaded from a device. Choose a photo (JPEG, PNG, WEBP, or GIF).");
  }
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size === 0) throw new Error("That file is empty.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("That image is over 40 MB. Choose a smaller one.");
  let decoded;
  try {
    decoded = await decode(file);
  } catch {
    throw new Error("This browser could not read that image. Try a JPEG or PNG.");
  }
  try {
    const originalWidth = decoded.width;
    const originalHeight = decoded.height;
    let edge = options.maxEdge ?? MAX_UPLOAD_EDGE;
    let quality = 0.82;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const fit = fitWithin(originalWidth, originalHeight, edge);
      const canvas = document.createElement("canvas");
      canvas.width = fit.width;
      canvas.height = fit.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser could not resize the image.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, fit.width, fit.height);
      context.drawImage(decoded.source, 0, 0, fit.width, fit.height);
      const blob = await toBlob(canvas, quality);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (sniffImage(bytes) !== "jpeg") throw new Error("This browser could not compress the image.");
      if (bytes.length <= maxBytes || edge <= 480) {
        if (bytes.length > maxBytes) throw new Error("That image is still too large after compressing it. Choose a smaller one.");
        const name = mediaFileName(file.name, "jpg", options.taken ?? []);
        const base64 = toBase64(bytes);
        return {
          name,
          src: `/media/${name}`,
          repoPath: `public/media/${name}`,
          type: "image/jpeg",
          base64,
          dataUrl: `data:image/jpeg;base64,${base64}`,
          bytes: bytes.length,
          width: fit.width,
          height: fit.height,
          originalWidth,
          originalHeight,
          originalBytes: file.size,
          scaled: fit.scaled || bytes.length < file.size,
        };
      }
      if (quality > 0.6) quality -= 0.11;
      else edge = Math.floor(edge * 0.8);
    }
    throw new Error("That image is still too large after compressing it. Choose a smaller one.");
  } finally {
    decoded.close();
  }
}

export type MediaEditResult = { ok: true; doc: TwildaDocument } | { ok: false; error: string };

function setStrings(doc: TwildaDocument, changes: Array<[string, string]>): MediaEditResult | TwildaDocument {
  let next: unknown = JSON.parse(JSON.stringify(doc));
  for (const [ref, value] of changes) {
    if (typeof getAtPath(next, ref) !== "string") return { ok: false, error: `"${ref}" is not an editable field.` };
    const parts = ref.split(".");
    let node = next as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) node = node[part] as Record<string, unknown>;
    node[parts.at(-1) as string] = value;
  }
  return next as TwildaDocument;
}

function settle(next: TwildaDocument, refs: string[], lenient: boolean): MediaEditResult {
  const parsed = documentSchema.safeParse(next);
  if (parsed.success) return { ok: true, doc: parsed.data };
  const own = parsed.error.issues.find((issue) => refs.some((ref) => ref.split(".").every((part, i) => String(issue.path[i]) === part)));
  if (!lenient || own) {
    const issue = own ?? parsed.error.issues[0];
    return { ok: false, error: `${String(issue?.path.at(-1) ?? "field")}: ${issue?.message ?? "not valid"}` };
  }
  return { ok: true, doc: next };
}

/**
 * Point an image at a repo file and (optionally) set its alt text. Only `/media/<name>.<ext>`
 * is accepted: the page prints nothing else, so offering anything else would be a trap.
 */
export function applyImageChoice(
  doc: TwildaDocument,
  srcRef: string,
  altRef: string,
  choice: { src?: string; alt?: string },
  options: { lenient?: boolean } = {},
): MediaEditResult {
  const changes: Array<[string, string]> = [];
  if (choice.src !== undefined) {
    if (!isRepoMedia(choice.src)) return { ok: false, error: "Choose an image from the repo's media folder or upload one." };
    changes.push([srcRef, choice.src]);
  }
  if (choice.alt !== undefined) {
    const alt = choice.alt.replace(/\s+/g, " ").trim();
    if (!alt) return { ok: false, error: "Describe the image in a few words. Screen readers read this." };
    changes.push([altRef, alt]);
  }
  const next = setStrings(doc, changes);
  if ("ok" in next) return next;
  return settle(next, changes.map(([ref]) => ref), options.lenient ?? false);
}

export const VIDEO_HELP = "Paste a YouTube or Vimeo link, for example https://www.youtube.com/watch?v=… or https://vimeo.com/….";

/**
 * Point a video block at an allowlisted video. The stored address is rebuilt from the
 * extracted id (the provider's watch page), never the pasted text, so tracking
 * parameters, credentials, and look-alike hosts do not survive.
 */
export function applyVideoChoice(
  doc: TwildaDocument,
  srcRef: string,
  titleRef: string,
  choice: { url?: string; title?: string },
  options: { lenient?: boolean } = {},
): MediaEditResult {
  const changes: Array<[string, string]> = [];
  if (choice.url !== undefined) {
    const video = parseVideoUrl(choice.url);
    if (!video) return { ok: false, error: `That link is not allowed. ${VIDEO_HELP}` };
    changes.push([srcRef, video.watchUrl]);
  }
  if (choice.title !== undefined) {
    const title = choice.title.replace(/\s+/g, " ").trim();
    if (!title) return { ok: false, error: "Give the video a short title. It is the frame's accessible name." };
    changes.push([titleRef, title]);
  }
  const next = setStrings(doc, changes);
  if ("ok" in next) return next;
  return settle(next, changes.map(([ref]) => ref), options.lenient ?? false);
}

export function describeVideo(src: string): string {
  const video = parseVideoUrl(src);
  return video ? `${VIDEO_PROVIDER_LABELS[video.provider]} video ${video.id}` : "No allowed video yet";
}
