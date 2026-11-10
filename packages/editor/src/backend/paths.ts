export function draftPath(id: string): string {
  return `content/${id}/draft.json`;
}

export function publishedPath(id: string): string {
  return `content/${id}/published.json`;
}

export function previewPath(id: string): string {
  return `content/${id}/preview-url.txt`;
}

export function buildFaultPath(id: string): string {
  return `content/${id}/build-fault.txt`;
}

export const MEDIA_INDEX = "media/index.json";
