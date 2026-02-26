import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { validateImageUploadFile } from "@/lib/api/uploads";

type Props = {
  fallbackText: string;
  initialUrl?: string | null;
  disabled?: boolean;
  onFileSelected?: (file: File | null) => void;
  error?: string | null;
};

export default function ProfilePhotoPicker({ fallbackText, initialUrl, disabled, onFileSelected, error }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl ?? null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(initialUrl ?? null);
  }, [initialUrl]);

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

    const next = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return next;
    });
    onFileSelected?.(file);
  }

  return (
    <div className="w-28 shrink-0">
      <div className="relative h-28 w-28 overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        {previewUrl ? (
          <img src={previewUrl} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white/90">
            {fallbackText}
          </div>
        )}
      </div>

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
    </div>
  );
}
