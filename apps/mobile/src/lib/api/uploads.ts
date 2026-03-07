import { authedFetch } from "./client";

type UploadedImageRef = {
  objectKey: string;
  publicUrl: string | null;
};

export async function uploadImageFromDevice(params: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  uploadKind?: "PROFILE" | "FRAGRANCE";
}): Promise<UploadedImageRef> {
  const form = new FormData();
  form.append("file", {
    uri: params.uri,
    name: params.fileName || "upload.jpg",
    type: params.mimeType || "image/jpeg",
  } as unknown as Blob);
  form.append("uploadKind", params.uploadKind ?? "PROFILE");

  const res = await authedFetch<UploadedImageRef>("/api/v1/uploads/image", {
    method: "POST",
    body: form,
  });

  if (!res?.objectKey) {
    throw new Error("Image upload failed.");
  }
  return res;
}
