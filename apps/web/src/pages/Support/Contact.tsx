import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NoticeDialog from "@/components/ui/notice-dialog";

export default function ContactSupportPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit = subject.trim().length >= 3 && message.trim().length >= 10;

  function onSubmit() {
    setNotice("Support submission endpoint not wired yet. Connect this to your support API or ticket system.");
  }

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto w-full max-w-2xl px-4 pb-10">
        <div className="mb-6 rounded-3xl border border-white/15 bg-black/30 p-5">
          <div className="text-xs uppercase tracking-[0.15em] text-amber-200/80">Support</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Contact Support</h1>
          <p className="mt-1 text-sm text-white/70">
            Report bugs, billing issues, account access problems, or moderation concerns.
          </p>
        </div>

        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Send a request</CardTitle>
            <CardDescription className="text-white/70">
              Include steps to reproduce and screenshots if you are reporting a bug.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white/80" htmlFor="support-subject">
                Subject
              </Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
                placeholder="Short summary of your issue"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80" htmlFor="support-message">
                Message
              </Label>
              <Textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[180px] rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
                placeholder="Tell us what happened, what you expected, and what device/browser you are using."
              />
            </div>

            <div className="flex items-center gap-3">
              <Button className="rounded-xl" disabled={!canSubmit} onClick={onSubmit}>
                Submit request
              </Button>
              <Button
                variant="secondary"
                className="rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15 !backdrop-blur-none"
                onClick={() => {
                  setSubject("");
                  setMessage("");
                }}
              >
                Clear
              </Button>
            </div>

            <p className="text-xs text-white/55">
              Temporary contact: <span className="text-white/75">support@stacta.com</span>
            </p>
          </CardContent>
        </Card>

        <div className="mt-8">
          <Button
            variant="ghost"
            className="rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => navigate(-1)}
          >
            ← Back
          </Button>
        </div>
      </div>

      <NoticeDialog
        open={Boolean(notice)}
        title="Support Integration Pending"
        message={notice ?? ""}
        onClose={() => setNotice(null)}
      />
    </div>
  );
}
