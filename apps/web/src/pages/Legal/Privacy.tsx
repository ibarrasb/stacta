import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto w-full max-w-3xl px-4 pb-10">
        <div className="mb-6 rounded-3xl border border-white/15 bg-black/30 p-5">
          <div className="text-xs uppercase tracking-[0.15em] text-amber-200/80">Legal</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Privacy Policy</h1>
          <p className="mt-1 text-sm text-white/70">Effective date: March 3, 2026</p>
        </div>

        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Your data on Stacta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-white/80">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">1. What we collect</h2>
              <p>
                We collect account details (like username/email), profile information, content you
                post, and usage metadata needed to operate the app.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">2. How we use data</h2>
              <p>
                We use data to provide core features, personalize your feed, maintain security,
                moderate abuse, and improve product quality.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">3. Sharing</h2>
              <p>
                We do not sell personal data. We may share data with service providers that help run
                infrastructure, authentication, analytics, and support under appropriate safeguards.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">4. Profile visibility</h2>
              <p>
                You control visibility settings (including private profile). Public content can be
                viewed by other users according to your configuration.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">5. Retention</h2>
              <p>
                We retain data as needed for operation, legal obligations, dispute resolution, and
                abuse prevention.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">6. Security</h2>
              <p>
                We use reasonable safeguards, but no service can guarantee absolute security.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-white">7. Contact</h2>
              <p>
                For privacy requests, use the Contact Support page and include enough detail for us
                to verify and process your request.
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
