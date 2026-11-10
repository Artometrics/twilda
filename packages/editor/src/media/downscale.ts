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
  if (edge <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height), scaled: false };
  }
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  };
}

export interface DownscaleResult {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  scaled: boolean;
  type: string;
}

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Shrink a raster image on the client before it is handed to the backend.
 * SVG, GIF, and images already inside the limit are stored unchanged.
 */
export async function downscaleImage(file: File, maxEdge = MAX_EDGE): Promise<DownscaleResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    const dataUrl = await readAsDataUrl(file);
    return {
      name: safeName(file.name),
      dataUrl,
      width: 0,
      height: 0,
      originalWidth: 0,
      originalHeight: 0,
      scaled: false,
      type: file.type,
    };
  }

  const bitmap = await createImageBitmap(file);
  try {
    const fit = fitWithin(bitmap.width, bitmap.height, maxEdge);
    if (!fit.scaled) {
      const dataUrl = await readAsDataUrl(file);
      return {
        name: safeName(file.name),
        dataUrl,
        width: bitmap.width,
        height: bitmap.height,
        originalWidth: bitmap.width,
        originalHeight: bitmap.height,
        scaled: false,
        type: file.type,
      };
    }
    const canvas = document.createElement("canvas");
    canvas.width = fit.width;
    canvas.height = fit.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not scale the image.");
    context.drawImage(bitmap, 0, 0, fit.width, fit.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error("Could not encode the scaled image."))),
        "image/jpeg",
        JPEG_QUALITY,
      );
    });
    const dataUrl = await readAsDataUrl(new File([blob], "scaled.jpg", { type: "image/jpeg" }));
    return {
      name: safeName(file.name.replace(/\.\w+$/, "") + ".jpg"),
      dataUrl,
      width: fit.width,
      height: fit.height,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
      scaled: true,
      type: "image/jpeg",
    };
  } finally {
    bitmap.close();
  }
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the file."));
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export function safeName(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "image";
}
