import { authedFetch } from "@/lib/api/client";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

export function validateImageUploadFile(file: File): string | null {
  if (!file) return "No file selected.";
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Unsupported file type. Use JPEG, PNG, or WebP.";
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

  const presign = await authedFetch<PresignUploadResponse>("/api/v1/uploads/presign", {
    method: "POST",
    body: JSON.stringify({
      contentType: file.type,
      contentLength: file.size,
      uploadKind,
    } satisfies PresignUploadRequest),
  });

  const putRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error("Image upload failed. Please try again.");
  }

  return { objectKey: presign.objectKey, publicUrl: presign.publicUrl };
}
