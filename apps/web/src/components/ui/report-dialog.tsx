import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type ReportReasonOption = {
  value: string;
  label: string;
};

export default function ReportDialog({
  open,
  onOpenChange,
  title,
  targetLabel,
  reasons,
  reason,
  onReasonChange,
  details,
  onDetailsChange,
  submitting,
  onSubmit,
  submitLabel = "Submit report",
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  targetLabel?: string | null;
  reasons: ReportReasonOption[];
  reason: string;
  onReasonChange: (next: string) => void;
  details: string;
  onDetailsChange: (next: string) => void;
  submitting?: boolean;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-w-md rounded-3xl border-white/15 bg-[#090a0f] text-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {targetLabel ? (
            <div className="text-sm text-white/80">
              Reporting: <span className="font-semibold">{targetLabel}</span>
            </div>
          ) : null}
          <div>
            <div className="mb-1 text-xs text-white/60">Reason</div>
            <select
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
            >
              {reasons.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 text-xs text-white/60">Details (optional)</div>
            <Textarea
              value={details}
              onChange={(e) => onDetailsChange(e.target.value)}
              placeholder="Add context for moderators..."
              className="min-h-20 rounded-xl border-white/10 bg-white/5 text-white"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="button" className="h-9 rounded-xl px-4" onClick={onSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
