import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { validateImageUploadFile } from "@/lib/api/uploads";

type Props = {
  fallbackText: string;
  initialUrl?: string | null;
  disabled?: boolean;
  onFileSelected?: (file: File | null) => void;
  error?: string | null;
};

const DEFAULT_AVATAR_IMG = "/stacta.png";
const CROP_PREVIEW_SIZE = 260;
const CROPPED_OUTPUT_SIZE = 1024;

export default function ProfilePhotoPicker({ fallbackText, initialUrl, disabled, onFileSelected, error }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl ?? null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [cropBusy, setCropBusy] = useState(false);
  const cropDragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setPreviewUrl(initialUrl ?? null);
  }, [initialUrl]);

  useEffect(() => {
    return () => {
      if (pendingFileUrl && pendingFileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pendingFileUrl);
      }
    };
  }, [pendingFileUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function onPickClick() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageUploadFile(file);
    if (validationError) {
      setLocalError(validationError);
      if (inputRef.current) inputRef.current.value = "";
      onFileSelected?.(null);
      return;
    }
    setLocalError(null);
    if (pendingFileUrl && pendingFileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingFileUrl);
    }
    setPendingFile(file);
    setPendingFileUrl(URL.createObjectURL(file));
    setCropZoom(1);
    setCropOffsetX(0);
    setCropOffsetY(0);
    setCropOpen(true);
  }

  async function onApplyCrop() {
    if (!pendingFile || !pendingFileUrl || cropBusy) return;
    setCropBusy(true);
    try {
      const cropped = await renderCroppedFile(
        pendingFile,
        pendingFileUrl,
        cropZoom,
        cropOffsetX,
        cropOffsetY
      );
      const next = URL.createObjectURL(cropped);
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return next;
      });
      onFileSelected?.(cropped);
      setCropOpen(false);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setLocalError("Could not crop image. Please try a different photo.");
    } finally {
      setCropBusy(false);
    }
  }

  function onCancelCrop() {
    setCropOpen(false);
    setPendingFile(null);
    if (pendingFileUrl && pendingFileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingFileUrl);
    }
    setPendingFileUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onCropPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (cropBusy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cropDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      ox: cropOffsetX,
      oy: cropOffsetY,
    };
  }

  function onCropPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;
    if (!drag || cropBusy) return;
    setCropOffsetX(Math.round(drag.ox + (e.clientX - drag.x)));
    setCropOffsetY(Math.round(drag.oy + (e.clientY - drag.y)));
  }

  function onCropPointerUp() {
    cropDragRef.current = null;
  }

  function adjustZoom(delta: number) {
    setCropZoom((prev) => Math.max(1, Math.min(3, Math.round((prev + delta) * 100) / 100)));
  }

  return (
    <div className="w-28 shrink-0">
      <button
        type="button"
        className="relative h-28 w-28 overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
        onClick={() => {
          if (!previewUrl?.trim()) return;
          setPreviewOpen(true);
        }}
      >
        <img
          src={previewUrl?.trim() ? previewUrl : DEFAULT_AVATAR_IMG}
          alt="Profile"
          className="h-full w-full object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallbackApplied === "1") return;
            img.dataset.fallbackApplied = "1";
            img.src = DEFAULT_AVATAR_IMG;
          }}
        />
        {!previewUrl ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-semibold text-white/15">
            {fallbackText}
          </div>
        ) : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onFileChange}
      />

      {!disabled ? (
        <>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 h-8 w-full rounded-xl border border-white/12 bg-white/10 px-2 text-[11px] text-white hover:bg-white/15"
            onClick={onPickClick}
          >
            Change photo
          </Button>
          {error || localError ? (
            <div className="mt-2 text-[11px] text-red-200">{error || localError}</div>
          ) : null}
        </>
      ) : null}

      <Dialog open={cropOpen} onOpenChange={(next) => (!next ? onCancelCrop() : setCropOpen(next))}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-lg rounded-3xl border-white/15 bg-[#121212]/95 p-0 text-white backdrop-blur-xl">
          <DialogHeader className="border-b border-white/10 px-5 py-4">
            <DialogTitle className="text-base text-white">Adjust Profile Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-5">
            <div className="mx-auto flex w-fit flex-col items-center gap-3">
              <div className="relative h-[260px] w-[260px] overflow-hidden rounded-3xl border border-white/15 bg-black/25">
                <div
                  className="relative h-full w-full touch-none cursor-grab active:cursor-grabbing"
                  onPointerDown={onCropPointerDown}
                  onPointerMove={onCropPointerMove}
                  onPointerUp={onCropPointerUp}
                  onPointerCancel={onCropPointerUp}
                  onWheel={(e) => {
                    e.preventDefault();
                    adjustZoom(e.deltaY > 0 ? -0.05 : 0.05);
                  }}
                >
                  {pendingFileUrl ? (
                    <img
                      src={pendingFileUrl}
                      alt="Crop preview"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none object-cover"
                      style={{
                        transform: `translate(calc(-50% + ${cropOffsetX}px), calc(-50% + ${cropOffsetY}px)) scale(${cropZoom})`,
                        transformOrigin: "center center",
                      }}
                    />
                  ) : null}
                </div>
              </div>
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-white/65">
                    Drag to position • Zoom {cropZoom.toFixed(2)}x
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 rounded-lg border border-white/12 bg-white/8 px-2 text-xs text-white hover:bg-white/14"
                      onClick={() => adjustZoom(-0.1)}
                    >
                      -
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 rounded-lg border border-white/12 bg-white/8 px-2 text-xs text-white hover:bg-white/14"
                      onClick={() => {
                        setCropZoom(1);
                        setCropOffsetX(0);
                        setCropOffsetY(0);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 rounded-lg border border-white/12 bg-white/8 px-2 text-xs text-white hover:bg-white/14"
                      onClick={() => adjustZoom(0.1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9 rounded-xl border border-white/12 bg-white/8 px-4 text-sm text-white hover:bg-white/12"
                onClick={onCancelCrop}
                disabled={cropBusy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9 rounded-xl px-4"
                onClick={() => void onApplyCrop()}
                disabled={cropBusy}
              >
                {cropBusy ? "Applying..." : "Use photo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-2xl rounded-3xl border-white/15 bg-black/85 p-3 text-white backdrop-blur-xl">
          <img
            src={previewUrl?.trim() ? previewUrl : DEFAULT_AVATAR_IMG}
            alt="Profile preview"
            className="max-h-[80vh] w-full rounded-2xl object-contain"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied === "1") return;
              img.dataset.fallbackApplied = "1";
              img.src = DEFAULT_AVATAR_IMG;
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function renderCroppedFile(
  file: File,
  fileUrl: string,
  zoom: number,
  offsetX: number,
  offsetY: number
): Promise<File> {
  const image = await loadImage(fileUrl);
  const working = document.createElement("canvas");
  working.width = CROP_PREVIEW_SIZE;
  working.height = CROP_PREVIEW_SIZE;
  const ctx = working.getContext("2d");
  if (!ctx) throw new Error("canvas-context");

  const baseScale = Math.max(
    CROP_PREVIEW_SIZE / image.naturalWidth,
    CROP_PREVIEW_SIZE / image.naturalHeight
  );
  const renderScale = baseScale * Math.max(1, zoom);
  const drawWidth = image.naturalWidth * renderScale;
  const drawHeight = image.naturalHeight * renderScale;
  const drawX = (CROP_PREVIEW_SIZE - drawWidth) / 2 + offsetX;
  const drawY = (CROP_PREVIEW_SIZE - drawHeight) / 2 + offsetY;

  ctx.clearRect(0, 0, CROP_PREVIEW_SIZE, CROP_PREVIEW_SIZE);
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  const out = document.createElement("canvas");
  out.width = CROPPED_OUTPUT_SIZE;
  out.height = CROPPED_OUTPUT_SIZE;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("canvas-context");
  outCtx.drawImage(working, 0, 0, CROPPED_OUTPUT_SIZE, CROPPED_OUTPUT_SIZE);

  const contentType = file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, contentType, 0.92));
  if (!blob) throw new Error("canvas-blob");

  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const baseName = (file.name || "profile").replace(/\.[^.]+$/, "") || "profile";
  return new File([blob], `${baseName}.${ext}`, { type: contentType });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}
