import { authedFetch } from "@/lib/api/client";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const EXTENSION_TO_CONTENT_TYPE: Array<[string, string]> = [
  [".jpg", "image/jpeg"],
  [".jpe", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".heic", "image/heic"],
  [".heif", "image/heif"],
];

export type PresignUploadRequest = {
  contentType: string;
  contentLength: number;
  uploadKind?: "PROFILE" | "FRAGRANCE";
};

export type PresignUploadResponse = {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string | null;
  expiresInSeconds: number;
};

export type UploadedImageRef = {
  objectKey: string;
  publicUrl: string | null;
};

function resolveImageContentType(file: File): string {
  const fromType = String(file.type ?? "").trim().toLowerCase();
  if (fromType) return fromType;

  const lowerName = String(file.name ?? "").trim().toLowerCase();
  for (const [ext, contentType] of EXTENSION_TO_CONTENT_TYPE) {
    if (lowerName.endsWith(ext)) return contentType;
  }
  return "";
}

export function validateImageUploadFile(file: File): string | null {
  if (!file) return "No file selected.";
  const contentType = resolveImageContentType(file);
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return "Unsupported file type. Use JPEG, PNG, WebP, HEIC, or HEIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "File is too large. Max size is 5 MB.";
  }
  return null;
}

export async function uploadImageFile(
  file: File,
  uploadKind: "PROFILE" | "FRAGRANCE" = "FRAGRANCE"
): Promise<UploadedImageRef> {
  const validationError = validateImageUploadFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  const contentType = resolveImageContentType(file);

  const presign = await authedFetch<PresignUploadResponse>("/api/v1/uploads/presign", {
    method: "POST",
    body: JSON.stringify({
      contentType,
      contentLength: file.size,
      uploadKind,
    } satisfies PresignUploadRequest),
  });

  let putRes: Response;
  try {
    putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
  } catch {
    // Safari/iOS can fail direct PUT to storage intermittently; fallback to API multipart upload.
    return uploadImageViaApi(file, uploadKind);
  }

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => "");
    if (putRes.status === 403) {
      throw new Error("Image upload was rejected by storage (403). Retry once; if it persists, refresh and try again.");
    }
    if (putRes.status === 413) {
      throw new Error("Image is too large for upload (max 5 MB).");
    }
    throw new Error(detail?.trim() || `Image upload failed (${putRes.status}).`);
  }

  return { objectKey: presign.objectKey, publicUrl: presign.publicUrl };
}

async function uploadImageViaApi(file: File, uploadKind: "PROFILE" | "FRAGRANCE"): Promise<UploadedImageRef> {
  const form = new FormData();
  form.append("file", file);
  form.append("uploadKind", uploadKind);
  const res = await authedFetch<UploadedImageRef>("/api/v1/uploads/image", {
    method: "POST",
    body: form,
  });
  if (!res?.objectKey) {
    throw new Error("Image upload fallback failed.");
  }
  return res;
}
