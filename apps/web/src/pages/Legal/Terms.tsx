import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto w-full max-w-3xl px-4 pb-10">
        <div className="mb-6 rounded-3xl border border-white/15 bg-black/30 p-5">
          <div className="text-xs uppercase tracking-[0.15em] text-amber-200/80">Legal</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Terms of Service</h1>
          <p className="mt-1 text-sm text-white/70">Effective date: March 3, 2026</p>
        </div>

        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Using Stacta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-white/80">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">1. Acceptance</h2>
              <p>
                By using Stacta, you agree to these terms. If you do not agree, do not use the app.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">2. Accounts</h2>
              <p>
                You are responsible for your account and activity. Keep your credentials secure and
                do not impersonate others.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">3. Content & conduct</h2>
              <p>
                You retain ownership of what you post, but you grant Stacta a license to display and
                distribute your content inside the service.
              </p>
              <p>
                You may not post unlawful, abusive, fraudulent, or infringing content, or attempt to
                disrupt service integrity.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">4. Moderation</h2>
              <p>
                We may remove content, limit accounts, or suspend access when needed to enforce these
                terms or protect users and platform safety.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">5. Availability</h2>
              <p>
                The service is provided as-is. We may update, change, or discontinue features without
                prior notice.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">6. Liability</h2>
              <p>
                To the maximum extent allowed by law, Stacta is not liable for indirect or
                consequential damages arising from use of the service.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">7. Changes</h2>
              <p>
                We may revise these terms. Continued use after changes means you accept the updated
                version.
              </p>
            </section>
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
    </div>
  );
}
