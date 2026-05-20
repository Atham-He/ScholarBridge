const DATA_URL_PREFIX = /^data:image\/(png|jpeg|jpg|webp);base64,/i;
const PUBLIC_IMAGE_PREFIX = /^\/images\//;

export const PROJECT_ILLUSTRATION_MAX_BYTES = 2 * 1024 * 1024;

export function normalizeProjectIllustrationUrl(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Project illustration must be an image file.");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (PUBLIC_IMAGE_PREFIX.test(trimmed)) {
    return trimmed;
  }

  if (!DATA_URL_PREFIX.test(trimmed)) {
    throw new Error("Project illustration must be a PNG, JPG, or WebP image.");
  }

  const base64 = trimmed.replace(DATA_URL_PREFIX, "");
  const estimatedBytes = Math.ceil((base64.length * 3) / 4);
  if (estimatedBytes > PROJECT_ILLUSTRATION_MAX_BYTES) {
    throw new Error("Project illustration must be smaller than 2 MB.");
  }

  return trimmed;
}
