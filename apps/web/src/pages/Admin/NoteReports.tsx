import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getMe } from "@/lib/api/me";
import {
  issueUserStrike,
  listFragranceReports,
  listNoteReportOffenders,
  listNoteReports,
  resolveFragranceReport,
  resolveNoteReport,
} from "@/lib/api/note-moderation";
import type { FragranceReportItem, NoteReportItem, NoteReportOffender } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import NoticeDialog from "@/components/ui/notice-dialog";
import InlineSpinner from "@/components/ui/inline-spinner";
import ConfirmDialog from "@/components/ui/confirm-dialog";

type Filter = "OPEN" | "ALL" | "RESOLVED_DISMISSED" | "RESOLVED_MERGED";

export default function AdminNoteReportsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [reports, setReports] = useState<NoteReportItem[]>([]);
  const [fragranceReports, setFragranceReports] = useState<FragranceReportItem[]>([]);
  const [mergeTargetById, setMergeTargetById] = useState<Record<string, string>>({});
  const [offendersByReportId, setOffendersByReportId] = useState<Record<string, NoteReportOffender[]>>({});
  const [loadingOffendersByReportId, setLoadingOffendersByReportId] = useState<Record<string, boolean>>({});
  const [strikeReasonByUserKey, setStrikeReasonByUserKey] = useState<Record<string, string>>({});
  const [strikeBusyKey, setStrikeBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm action");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [confirmLabel, setConfirmLabel] = useState("Confirm");
  const [confirmDestructive, setConfirmDestructive] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const confirmActionRef = useRef<null | (() => Promise<void>)>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setIsAdmin(Boolean(me.isAdmin));
      })
      .catch(() => {
        if (cancelled) return;
        setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingAuth(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listNoteReports({ status: filter, limit: 200 });
      setReports(Array.isArray(res?.items) ? res.items : []);
      const fragranceStatus =
        filter === "RESOLVED_MERGED" ? "ALL" : (filter as "OPEN" | "ALL" | "RESOLVED_DISMISSED" | "RESOLVED_DELETED");
      const fragranceRes = await listFragranceReports({ status: fragranceStatus, limit: 200 });
      setFragranceReports(Array.isArray(fragranceRes?.items) ? fragranceRes.items : []);
    } catch (e: any) {
      setNotice(e?.message || "Failed to load note reports.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  async function dismissReport(reportId: string) {
    setSavingId(reportId);
    try {
      await resolveNoteReport(reportId, { action: "DISMISS" });
      await load();
    } catch (e: any) {
      setNotice(e?.message || "Failed to dismiss report.");
    } finally {
      setSavingId(null);
    }
  }

  async function mergeReport(reportId: string) {
    const targetNoteId = String(mergeTargetById[reportId] ?? "").trim();
    if (!targetNoteId) {
      setNotice("Enter a target note UUID to merge into.");
      return;
    }
    setSavingId(reportId);
    try {
      await resolveNoteReport(reportId, { action: "MERGE_INTO", targetNoteId });
      await load();
    } catch (e: any) {
      setNotice(e?.message || "Failed to merge note.");
    } finally {
      setSavingId(null);
    }
  }

  async function loadOffenders(reportId: string) {
    setLoadingOffendersByReportId((prev) => ({ ...prev, [reportId]: true }));
    try {
      const rows = await listNoteReportOffenders(reportId);
      setOffendersByReportId((prev) => ({ ...prev, [reportId]: Array.isArray(rows) ? rows : [] }));
    } catch (e: any) {
      setNotice(e?.message || "Failed to load offenders.");
    } finally {
      setLoadingOffendersByReportId((prev) => ({ ...prev, [reportId]: false }));
    }
  }

  async function strikeUser(report: NoteReportItem, offender: NoteReportOffender) {
    const key = `${report.id}:${offender.userId}`;
    const fallback = `Offensive/spam note moderation for "${report.noteName}" (${report.reason}).`;
    const reason = (strikeReasonByUserKey[key] ?? "").trim() || fallback;
    setStrikeBusyKey(key);
    try {
      await issueUserStrike({
        userId: offender.userId,
        noteReportId: report.id,
        reason,
        points: 1,
      });
      const rows = await listNoteReportOffenders(report.id);
      setOffendersByReportId((prev) => ({ ...prev, [report.id]: Array.isArray(rows) ? rows : [] }));
      setNotice(`Strike issued to @${offender.username ?? offender.displayName ?? offender.userId.slice(0, 8)}.`);
    } catch (e: any) {
      setNotice(e?.message || "Failed to issue strike.");
    } finally {
      setStrikeBusyKey(null);
    }
  }

  function openConfirm(
    options: {
      title: string;
      description: string;
      confirmLabel: string;
      destructive?: boolean;
    },
    action: () => Promise<void>
  ) {
    setConfirmTitle(options.title);
    setConfirmDescription(options.description);
    setConfirmLabel(options.confirmLabel);
    setConfirmDestructive(Boolean(options.destructive));
    confirmActionRef.current = action;
    setConfirmOpen(true);
  }

  async function onConfirmAction() {
    const action = confirmActionRef.current;
    if (!action) {
      setConfirmOpen(false);
      return;
    }
    setConfirmBusy(true);
    try {
      await action();
      setConfirmOpen(false);
    } finally {
      setConfirmBusy(false);
      confirmActionRef.current = null;
    }
  }

  const openCount = useMemo(() => reports.filter((x) => x.status === "OPEN").length, [reports]);
  const openFragranceCount = useMemo(
    () => fragranceReports.filter((x) => x.status === "OPEN").length,
    [fragranceReports]
  );

  if (loadingAuth) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mt-6 rounded-2xl border border-white/15 bg-black/25 p-4 text-sm text-white/75">
          <span className="inline-flex items-center gap-2">
            <InlineSpinner />
            Loading admin access…
          </span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
          Admin access required.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 text-white">
      <div className="mt-6 rounded-3xl border border-white/15 bg-black/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Admin</div>
            <h1 className="mt-1 text-2xl font-semibold">Note Reports</h1>
            <div className="mt-1 text-sm text-white/65">
              {openCount} open note report(s) • {openFragranceCount} open fragrance report(s)
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(["OPEN", "ALL", "RESOLVED_DISMISSED", "RESOLVED_MERGED"] as Filter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={[
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold",
                  filter === value
                    ? "border-amber-200/35 bg-amber-300/20 text-amber-100"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {value.replaceAll("_", " ")}
              </button>
            ))}
            <Button variant="secondary" className="h-8 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={load}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-white/15 bg-black/25 p-4 text-sm text-white/75">
            <span className="inline-flex items-center gap-2">
              <InlineSpinner />
              Loading reports…
            </span>
          </div>
        ) : reports.length ? (
          reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/15 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold">{r.noteName}</div>
                <div className="text-xs text-white/60">
                  {r.status} • usage {r.noteUsageCount}
                </div>
              </div>
              <div className="mt-2 text-xs text-white/70">
                Reason: {r.reason} • Reporter: {r.reportedByUsername ? `@${r.reportedByUsername}` : (r.reportedByDisplayName || "Unknown")}
              </div>
              {r.details ? <div className="mt-1 text-xs text-white/60">{r.details}</div> : null}
              <div className="mt-1 text-[11px] text-white/45">
                noteId: {r.noteId}
              </div>

              {r.status === "OPEN" ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 rounded-xl border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
                      onClick={() => dismissReport(r.id)}
                      disabled={savingId === r.id}
                    >
                      Dismiss
                    </Button>
                    <input
                      value={mergeTargetById[r.id] ?? ""}
                      onChange={(e) => setMergeTargetById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Target note UUID"
                      className="h-8 min-w-[240px] flex-1 rounded-xl border border-white/15 bg-white/5 px-3 text-xs text-white outline-none"
                    />
                    <Button
                      type="button"
                      className="h-8 rounded-xl px-3 text-xs"
                      onClick={() => mergeReport(r.id)}
                      disabled={savingId === r.id}
                    >
                      Merge
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 rounded-xl border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
                      onClick={() => loadOffenders(r.id)}
                      disabled={Boolean(loadingOffendersByReportId[r.id])}
                    >
                      {loadingOffendersByReportId[r.id] ? "Loading offenders…" : "Show offenders"}
                    </Button>
                  </div>

                  {offendersByReportId[r.id] ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="mb-2 text-xs font-medium text-white/70">Linked creators</div>
                      {offendersByReportId[r.id].length ? (
                        <div className="space-y-2">
                          {offendersByReportId[r.id].map((o) => {
                            const key = `${r.id}:${o.userId}`;
                            return (
                              <div key={key} className="rounded-lg border border-white/10 bg-black/20 p-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-xs text-white/85">
                                    {o.username ? `@${o.username}` : "Unknown user"} {o.displayName ? `(${o.displayName})` : ""}
                                  </div>
                                  <div className="text-[11px] text-white/55">
                                    fragrances: {o.fragranceCount} • strikes: {o.strikeCount}
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <input
                                    value={strikeReasonByUserKey[key] ?? ""}
                                    onChange={(e) => setStrikeReasonByUserKey((prev) => ({ ...prev, [key]: e.target.value }))}
                                    placeholder="Strike reason (optional)"
                                    className="h-8 min-w-[220px] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white outline-none"
                                  />
                                  <Button
                                    type="button"
                                    className="h-8 rounded-lg px-3 text-xs"
                                    onClick={() =>
                                      openConfirm(
                                        {
                                          title: "Issue Strike?",
                                          description: `Issue a strike to ${o.username ? `@${o.username}` : "this user"} for note "${r.noteName}"?`,
                                          confirmLabel: "Issue strike",
                                          destructive: true,
                                        },
                                        async () => {
                                          await strikeUser(r, o);
                                        }
                                      )
                                    }
                                    disabled={strikeBusyKey === key}
                                  >
                                    {strikeBusyKey === key ? "Issuing…" : "Strike +1"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-white/50">No linked community creators for this note.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : r.status === "RESOLVED_MERGED" ? (
                <div className="mt-2 text-xs text-cyan-100/80">
                  Merged into {r.mergedIntoNoteName ?? r.mergedIntoNoteId ?? "unknown"}.
                </div>
              ) : (
                <div className="mt-2 text-xs text-white/60">Resolved by @{r.resolvedByUsername ?? "unknown"}.</div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/15 bg-black/25 p-4 text-sm text-white/65">
            No reports for this filter.
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl border border-white/15 bg-black/25 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fragrance Reports</h2>
          <div className="text-xs text-white/60">{fragranceReports.length} items</div>
        </div>
        {fragranceReports.length ? (
          <div className="space-y-3">
            {fragranceReports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/15 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {r.fragranceBrand} - {r.fragranceName}
                  </div>
                  <div className="text-xs text-white/60">{r.status}</div>
                </div>
                <div className="mt-1 text-xs text-white/65">
                  Creator: {r.creatorUsername ? `@${r.creatorUsername}` : "Unknown"} • Reporter:{" "}
                  {r.reportedByUsername ? `@${r.reportedByUsername}` : r.reportedByDisplayName || "Unknown"}
                </div>
                <div className="mt-1 text-xs text-white/65">Reason: {r.reason}</div>
                {r.details ? <div className="mt-1 text-xs text-white/55">{r.details}</div> : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link
                    className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-400/20"
                    to={`/fragrances/${encodeURIComponent(r.fragranceExternalId)}?source=COMMUNITY`}
                  >
                    View fragrance
                  </Link>
                  {r.status === "OPEN" ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 rounded-xl border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20"
                        onClick={async () => {
                          try {
                            await resolveFragranceReport(r.id, { action: "DISMISS" });
                            await load();
                          } catch (e: any) {
                            setNotice(e?.message || "Failed to dismiss fragrance report.");
                          }
                        }}
                      >
                        Dismiss
                      </Button>
                      <Button
                        type="button"
                        className="h-8 rounded-xl bg-red-500/80 px-3 text-xs text-white hover:bg-red-500"
                        onClick={() =>
                          openConfirm(
                            {
                              title: "Delete Fragrance?",
                              description: `Delete "${r.fragranceBrand} - ${r.fragranceName}" and related records? This cannot be undone.`,
                              confirmLabel: "Delete fragrance",
                              destructive: true,
                            },
                            async () => {
                              try {
                                await resolveFragranceReport(r.id, { action: "DELETE_FRAGRANCE" });
                                await load();
                              } catch (e: any) {
                                setNotice(e?.message || "Failed to delete fragrance.");
                              }
                            }
                          )
                        }
                      >
                        Delete fragrance
                      </Button>
                      {r.creatorUserId ? (
                        <Button
                          type="button"
                          className="h-8 rounded-xl px-3 text-xs"
                          onClick={() =>
                            openConfirm(
                              {
                                title: "Issue Strike?",
                                description: `Issue a strike to ${r.creatorUsername ? `@${r.creatorUsername}` : "this creator"} for this reported fragrance?`,
                                confirmLabel: "Issue strike",
                                destructive: true,
                              },
                              async () => {
                                try {
                                  await issueUserStrike({
                                    userId: r.creatorUserId!,
                                    reason: `Reported fragrance moderation (${r.reason})`,
                                    points: 1,
                                  });
                                  setNotice(`Strike issued to @${r.creatorUsername ?? "user"}.`);
                                  await load();
                                } catch (e: any) {
                                  setNotice(e?.message || "Failed to issue strike.");
                                }
                              }
                            )
                          }
                        >
                          Strike creator +1
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/15 bg-black/20 p-4 text-sm text-white/65">
            No fragrance reports for this filter.
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-white/45">
        Tip: if you need note IDs, open search and copy from network payloads, or add a quick internal notes table page next.
      </div>

      <div className="mt-4 text-xs text-white/50">
        <Link className="underline hover:text-white" to="/home">Back to app</Link>
      </div>

      <NoticeDialog
        open={Boolean(notice)}
        title="Admin"
        message={notice ?? ""}
        onClose={() => setNotice(null)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        cancelLabel="Cancel"
        destructive={confirmDestructive}
        loading={confirmBusy}
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={onConfirmAction}
      />
    </div>
  );
}
