import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import NoticeDialog from "@/components/ui/notice-dialog";

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {description ? (
          <p className="text-xs text-white/60">{description}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!value)}
        className={[
          "relative h-6 w-11 rounded-full border transition",
          value ? "bg-white/20 border-white/20" : "bg-white/10 border-white/12",
        ].join(" ")}
        aria-pressed={value}
        aria-label={label}
      >
        <span
          className={[
            "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white transition",
            value ? "left-5" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();

  // local-only UI state (wire to backend/auth later)
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  // privacy & safety
  const [isPrivate, setIsPrivate] = useState(false);
  const [hideActivity, setHideActivity] = useState(false);
  const [hideCollections, setHideCollections] = useState(false);

  // notifications
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isProfileDirty = useMemo(() => {
    return displayName.trim().length > 0 || username.trim().length > 0;
  }, [displayName, username]);

  async function onSaveProfile() {
    // TODO: call your API: PATCH /api/v1/me (or similar)
    // await api.me.updateProfile({ displayName, username })
    setNotice("Hook this up to your profile update endpoint.");
  }

  async function onChangePassword() {
    // If you already have a Forgot Password flow,
    // the simplest “change password” is: send them to it.
    navigate("/forgot-password");
  }

  async function onExportData() {
    // TODO: GET /api/v1/me/export (or async job)
    setNotice("Hook this up to export my data.");
  }

  async function onSignOut() {
    // TODO: call your auth sign out helper
    // await authSignOut()
    // navigate("/")
    setNotice("Hook this up to your sign-out function, then redirect to /.");
  }

  async function onDeleteAccount() {
    setDeleteConfirmOpen(false);
    // TODO: call your API: DELETE /api/v1/me
    // await api.me.deleteAccount()
    // await authSignOut()
    // navigate("/")
    setNotice("Hook this up to DELETE /api/v1/me, then sign out + redirect.");
  }

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto w-full max-w-2xl px-4 pb-10">
        <div className="mb-6 rounded-3xl border border-white/15 bg-black/30 p-5">
          <div className="text-xs uppercase tracking-[0.15em] text-amber-200/80">Controls</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Settings</h1>
          <p className="mt-1 text-sm text-white/70">
            Manage your profile, privacy, notifications, and account.
          </p>
        </div>

        {/* Profile */}
        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription className="text-white/70">
              Update how your profile appears to others.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white/80" htmlFor="displayName">
                Display name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80" htmlFor="username">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/35"
              />
              <p className="text-xs text-white/50">
                Keep it lowercase with letters, numbers, and underscores.
              </p>
            </div>

            <div className="flex gap-3">
              <Button className="rounded-xl" disabled={!isProfileDirty} onClick={onSaveProfile}>
                Save changes
              </Button>
              <Button
                variant="secondary"
                className="rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                onClick={() => {
                  setDisplayName("");
                  setUsername("");
                }}
                disabled={!isProfileDirty}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8 bg-white/10" />

        {/* Security */}
        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription className="text-white/70">
              Password and sign-in related settings.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <Button
              variant="secondary"
              className="rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
              onClick={onChangePassword}
            >
              Change password
            </Button>

            <Button
              variant="secondary"
              className="rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
              onClick={onSignOut}
            >
              Sign out
            </Button>

            <p className="text-xs text-white/50">
              For now “Change password” routes to the password reset flow. We can implement true
              change-password (current + new) once we confirm your Cognito approach.
            </p>
          </CardContent>
        </Card>

        <Separator className="my-8 bg-white/10" />

        {/* Privacy & safety */}
        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Privacy & safety</CardTitle>
            <CardDescription className="text-white/70">
              Control who can see you and how you interact.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <ToggleRow
              label="Private profile"
              description="Only approved followers can see your profile and activity."
              value={isPrivate}
              onChange={(v) => {
                setIsPrivate(v);
                // TODO: PATCH /api/v1/me/privacy
              }}
            />

            <ToggleRow
              label="Hide activity"
              description="Hide your recent reviews / logs from others."
              value={hideActivity}
              onChange={(v) => {
                setHideActivity(v);
                // TODO: PATCH /api/v1/me/privacy
              }}
            />

            <ToggleRow
              label="Hide collections"
              description="Hide your collections from public view."
              value={hideCollections}
              onChange={(v) => {
                setHideCollections(v);
                // TODO: PATCH /api/v1/me/privacy
              }}
            />

            <div className="flex flex-col gap-3 pt-2">
              <Button
                variant="secondary"
                className="rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                onClick={() => navigate("/settings/blocked")}
              >
                Blocked users
              </Button>

              <p className="text-xs text-white/50">
                Manage people you’ve blocked. Blocking prevents them from viewing/interacting with
                your profile and content.
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8 bg-white/10" />

        {/* Notifications */}
        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription className="text-white/70">
              Choose what you want to be notified about.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <ToggleRow
              label="New followers"
              description="Notify when someone follows you."
              value={notifFollows}
              onChange={(v) => {
                setNotifFollows(v);
                // TODO: PATCH /api/v1/me/notifications
              }}
            />

            <ToggleRow
              label="Likes"
              description="Notify when someone likes your content."
              value={notifLikes}
              onChange={(v) => {
                setNotifLikes(v);
                // TODO: PATCH /api/v1/me/notifications
              }}
            />

            <ToggleRow
              label="Comments"
              description="Notify when someone comments on your content."
              value={notifComments}
              onChange={(v) => {
                setNotifComments(v);
                // TODO: PATCH /api/v1/me/notifications
              }}
            />

            <ToggleRow
              label="Weekly digest"
              description="A weekly recap email (popular reviews, new follows, etc.)."
              value={notifDigest}
              onChange={(v) => {
                setNotifDigest(v);
                // TODO: PATCH /api/v1/me/notifications
              }}
            />
          </CardContent>
        </Card>

        <Separator className="my-8 bg-white/10" />

        {/* Data */}
        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription className="text-white/70">
              Download or manage your account data.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <Button
              variant="secondary"
              className="rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
              onClick={onExportData}
            >
              Export my data
            </Button>

            <p className="text-xs text-white/50">
              This should generate a downloadable export of your profile, logs, reviews, lists, etc.
            </p>
          </CardContent>
        </Card>

        <Separator className="my-8 bg-white/10" />

        {/* Legal & help */}
        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Legal & help</CardTitle>
            <CardDescription className="text-white/70">
              Policies, terms, and support.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <Button
              variant="secondary"
              className="rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
              onClick={() => navigate("/terms")}
            >
              Terms of Service
            </Button>

            <Button
              variant="secondary"
              className="rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
              onClick={() => navigate("/privacy")}
            >
              Privacy Policy
            </Button>

            <Button
              variant="secondary"
              className="rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
              onClick={() => navigate("/support")}
            >
              Contact support
            </Button>

            <p className="text-xs text-white/50">
              App version: <span className="text-white/70">0.1.0</span>
            </p>
          </CardContent>
        </Card>

        <Separator className="my-8 bg-white/10" />

        {/* Danger zone */}
        <Card className="rounded-2xl border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription className="text-white/70">
              These actions are permanent.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <Button variant="destructive" className="rounded-xl" onClick={() => setDeleteConfirmOpen(true)}>
              Delete account
            </Button>

            <p className="text-xs text-white/50">
              This should delete your user record + associated data, then sign you out.
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

        <ConfirmDialog
          open={deleteConfirmOpen}
          title="Delete Account?"
          description="This will permanently delete your account and data. This cannot be undone."
          confirmLabel="Delete Account"
          cancelLabel="Cancel"
          destructive
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={onDeleteAccount}
        />

        <NoticeDialog
          open={Boolean(notice)}
          title="Coming Soon"
          message={notice ?? ""}
          onClose={() => setNotice(null)}
        />
      </div>
    </div>
  );
}
