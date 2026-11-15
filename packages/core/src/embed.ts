/**
 * Video embeds, allowlisted by provider. Only the two providers below can become
 * a player. A pasted address is parsed, not trusted: the player URL is built from
 * the extracted video id, never from the address the editor typed.
 */

export type VideoProvider = "youtube" | "vimeo";

export interface VideoEmbed {
  provider: VideoProvider;
  id: string;
  /** The address stored in the document. Always the provider's public watch page. */
  watchUrl: string;
  /** The `src` of the player frame. Built from `id` only. */
  embedUrl: string;
}

/** Hosts a frame may load from. The site's `Content-Security-Policy` `frame-src` lists exactly these. */
export const EMBED_FRAME_HOSTS = ["https://www.youtube-nocookie.com", "https://player.vimeo.com"] as const;

export const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

function youtube(id: string | null | undefined): VideoEmbed | null {
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return {
    provider: "youtube",
    id,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
  };
}

function vimeo(id: string | null | undefined): VideoEmbed | null {
  if (!id || !VIMEO_ID.test(id)) return null;
  return {
    provider: "vimeo",
    id,
    watchUrl: `https://vimeo.com/${id}`,
    embedUrl: `https://player.vimeo.com/video/${id}`,
  };
}

/**
 * Read a pasted address. Returns null for anything that is not an https page of an
 * allowlisted provider with a well-formed id: other hosts, look-alike hosts
 * (`youtube.com.evil.test`), `javascript:`, `data:`, credentials in the URL, and
 * ids with extra characters.
 */
export function parseVideoUrl(input: string): VideoEmbed | null {
  const value = input.trim();
  if (!value || value.length > 400) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be") return youtube(parts[0]);
  if (YOUTUBE_HOSTS.has(host)) {
    if (parts[0] === "watch") return youtube(url.searchParams.get("v"));
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") return youtube(parts[1]);
    return null;
  }
  if (VIMEO_HOSTS.has(host)) {
    if (host === "player.vimeo.com") return parts[0] === "video" ? vimeo(parts[1]) : null;
    return parts.length === 1 ? vimeo(parts[0]) : null;
  }
  return null;
}

/** True when `src` can be rendered as a player. */
export function isAllowlistedVideo(src: string): boolean {
  return parseVideoUrl(src) !== null;
}
