import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NoticeDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  closeLabel?: string;
  onClose: () => void;
};

export default function NoticeDialog({
  open,
  title = "Notice",
  message,
  closeLabel = "Got it",
  onClose,
}: NoticeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md rounded-3xl border-white/15 bg-[#090a0f]">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-white/70">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            className="rounded-xl"
            onClick={onClose}
          >
            {closeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
