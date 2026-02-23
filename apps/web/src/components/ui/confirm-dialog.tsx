import { Button } from "@/components/ui/button";
import InlineSpinner from "@/components/ui/inline-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-md rounded-3xl border-white/15 bg-[#090a0f] p-5 sm:p-6">
        <DialogHeader className="space-y-2">
          <DialogTitle className="pr-8 text-white">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-white/70">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-5 gap-2">
          <Button
            variant="secondary"
            className="h-10 w-full rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18 sm:w-auto"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            className="h-10 w-full rounded-xl sm:w-auto"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <InlineSpinner />
                <span>Working</span>
              </span>
            ) : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
