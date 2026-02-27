import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ellipsis, Flag, MessageCircle, Reply, Trash2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReviewCard from "@/components/feed/ReviewCard";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import ReportDialog from "@/components/ui/report-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createReviewComment,
  deleteReviewComment,
  getReviewThread,
  reportReviewComment,
} from "@/lib/api/reviews";
import type { ReviewCommentItem, ReviewThreadResponse } from "@/lib/api/types";

const COMMENT_REPORT_REASONS = [
  { value: "INAPPROPRIATE", label: "Inappropriate" },
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "OTHER", label: "Other" },
] as const;

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function initials(name?: string | null) {
  const n = (name || "").trim();
  if (!n) return "S";
  const parts = n.split(/\s+/).slice(0, 2);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "S";
}

function CommentActionMenu({
  open,
  canDelete,
  busy,
  onToggle,
  onDelete,
  onReport,
}: {
  open: boolean;
  canDelete: boolean;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onReport: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center text-white/65 transition hover:text-white"
        onClick={onToggle}
      >
        <Ellipsis className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1.5 min-w-[148px] rounded-xl border border-white/15 bg-[#101114]/95 p-1.5 shadow-[0_14px_28px_rgba(0,0,0,0.45)] backdrop-blur">
          {canDelete ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-100 transition hover:bg-red-500/15"
              onClick={onDelete}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {busy ? "Deleting..." : "Delete comment"}
            </button>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/85 transition hover:bg-white/10"
              onClick={onReport}
              disabled={busy}
            >
              <Flag className="h-3.5 w-3.5" />
              {busy ? "Reporting..." : "Report comment"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ReviewThreadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reviewId = "" } = useParams<{ reviewId: string }>();
  const backTarget = (location.state as any)?.from?.pathname || "/home";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<ReviewThreadResponse | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReviewCommentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [workingCommentId, setWorkingCommentId] = useState<string | null>(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<"SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "OTHER">("INAPPROPRIATE");
  const [reportDetails, setReportDetails] = useState("");
  const composerRef = useRef<HTMLElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);

  const loadThread = useCallback(async () => {
    if (!reviewId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getReviewThread(reviewId);
      setThread(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load comments.");
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  const commentsByParent = useMemo(() => {
    const grouped = new Map<string | null, ReviewCommentItem[]>();
    for (const c of thread?.comments ?? []) {
      const key = c.parentCommentId ?? null;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(c);
    }
    return grouped;
  }, [thread?.comments]);

  const rootComments = commentsByParent.get(null) ?? [];

  async function onSubmitComment() {
    const body = newComment.trim();
    if (!thread?.review?.id || !body || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createReviewComment(thread.review.id, {
        body,
        parentCommentId: replyTarget?.id ?? null,
      });
      setNewComment("");
      setReplyTarget(null);
      await loadThread();
    } catch (e: any) {
      setError(e?.message || "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteComment(commentId: string) {
    if (!thread?.review?.id || !commentId) return;
    if (!window.confirm("Delete this comment? Replies under it will also be removed.")) return;
    setWorkingCommentId(commentId);
    setOpenMenuCommentId(null);
    setError(null);
    try {
      await deleteReviewComment(thread.review.id, commentId);
      await loadThread();
    } catch (e: any) {
      setError(e?.message || "Failed to delete comment.");
    } finally {
      setWorkingCommentId(null);
    }
  }

  function onOpenReportComment(commentId: string) {
    if (!commentId) return;
    setOpenMenuCommentId(null);
    setReportCommentId(commentId);
    setReportReason("INAPPROPRIATE");
    setReportDetails("");
    setReportDialogOpen(true);
  }

  async function onSubmitReportComment() {
    if (!thread?.review?.id || !reportCommentId) return;
    setWorkingCommentId(reportCommentId);
    setError(null);
    try {
      await reportReviewComment(thread.review.id, reportCommentId, {
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
      setReportDialogOpen(false);
      setReportCommentId(null);
    } catch (e: any) {
      setError(e?.message || "Failed to report comment.");
    } finally {
      setWorkingCommentId(null);
    }
  }

  function focusComposer() {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      composerInputRef.current?.focus();
    }, 160);
  }

  function startReply(comment: ReviewCommentItem) {
    setReplyTarget(comment);
    focusComposer();
  }

  function renderComment(comment: ReviewCommentItem, isReply: boolean) {
    return (
      <article
        key={comment.id}
        className={[
          "group relative overflow-visible rounded-2xl border p-3.5 backdrop-blur-xl",
          isReply
            ? "border-cyan-200/15 bg-gradient-to-br from-cyan-500/10 via-white/[0.03] to-transparent"
            : "border-white/12 bg-gradient-to-br from-white/[0.07] via-white/[0.03] to-transparent",
        ].join(" ")}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-left"
              onClick={() => navigate(`/u/${comment.authorUsername}`)}
            >
              {comment.authorAvatarUrl ? (
                <img
                  src={comment.authorAvatarUrl}
                  alt={`${comment.authorUsername} avatar`}
                  className="h-7 w-7 rounded-full border border-white/15 object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-semibold text-white/80">
                  {initials(comment.authorDisplayName || comment.authorUsername)}
                </div>
              )}
              <span className="truncate text-sm font-semibold text-white">{comment.authorDisplayName || comment.authorUsername}</span>
            </button>
            <div className="mt-1 text-[11px] text-white/55">@{comment.authorUsername} • {timeAgo(comment.createdAt)}</div>
          </div>
          <CommentActionMenu
            open={openMenuCommentId === comment.id}
            canDelete={comment.viewerCanDelete}
            busy={workingCommentId === comment.id}
            onToggle={() => setOpenMenuCommentId((prev) => (prev === comment.id ? null : comment.id))}
            onDelete={() => void onDeleteComment(comment.id)}
            onReport={() => onOpenReportComment(comment.id)}
          />
        </div>

        <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-white/86">{comment.body}</p>
        {!isReply ? (
          <button
            type="button"
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-cyan-200 transition hover:text-cyan-100"
            onClick={() => startReply(comment)}
          >
            <Reply className="h-3.5 w-3.5" />
            Reply
          </button>
        ) : null}
      </article>
    );
  }

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <div className="mb-4 rounded-3xl border border-white/15 bg-black/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Review thread</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Comments</h1>
            </div>
            <Button
              variant="secondary"
              className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
              onClick={() => navigate(backTarget)}
            >
              Back
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-white/12 bg-black/25 p-6">
            <LoadingSpinner label="Loading comments..." />
          </div>
        ) : !thread ? (
          <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white/65">
            Review not found.
          </div>
        ) : (
          <div className="space-y-4">
            <ReviewCard
              item={thread.review}
              timeAgo={timeAgo(thread.review.createdAt)}
              onOpenUser={() => navigate(`/u/${thread.review.actorUsername}`)}
              onOpenFragrance={() => {
                if (!thread.review.fragranceExternalId) return;
                const source = String(thread.review.fragranceSource ?? "FRAGELLA").toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
                navigate(`/fragrances/${encodeURIComponent(thread.review.fragranceExternalId)}?source=${source}`);
              }}
            />

            <section ref={composerRef} className="rounded-3xl border border-white/15 bg-black/25 p-4 backdrop-blur-xl">
              <div className="mb-2 text-sm font-semibold text-white">
                {replyTarget ? `Replying to @${replyTarget.authorUsername}` : "Add a comment"}
              </div>
              <Textarea
                ref={composerInputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTarget ? "Write your reply..." : "Write your comment..."}
                maxLength={1200}
                className="min-h-[100px] rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/45"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-xs text-white/55">{newComment.trim().length}/1200</div>
                <div className="flex items-center gap-2">
                  {replyTarget ? (
                    <Button
                      variant="secondary"
                      className="h-9 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                      onClick={() => setReplyTarget(null)}
                      disabled={submitting}
                    >
                      Cancel reply
                    </Button>
                  ) : null}
                  <Button className="h-9 rounded-xl px-4" onClick={() => void onSubmitComment()} disabled={submitting || !newComment.trim()}>
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <InlineSpinner />
                        <span>Posting</span>
                      </span>
                    ) : "Post"}
                  </Button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/15 bg-black/25 p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-white">
                  <MessageCircle className="mr-1.5 inline h-4 w-4 text-[#3EB489]" />
                  {thread.comments.length} comment{thread.comments.length === 1 ? "" : "s"}
                </div>
              </div>

              {rootComments.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/65">
                  No comments yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {rootComments.map((comment) => {
                    const replies = commentsByParent.get(comment.id) ?? [];
                    return (
                      <div key={comment.id} className="space-y-2">
                        {renderComment(comment, false)}
                        {replies.length ? (
                          <div className="ml-5 space-y-2 border-l border-cyan-200/25 pl-3">
                            {replies.map((reply) => renderComment(reply, true))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      {!loading && thread ? (
        <div className="fixed bottom-20 right-4 z-40 sm:bottom-6">
          <Button
            type="button"
            className="h-10 rounded-full border border-[#3EB489]/50 bg-[#3EB489]/25 px-4 text-white hover:bg-[#3EB489]/35"
            onClick={focusComposer}
          >
            <MessageCircle className="mr-1.5 h-4 w-4" />
            Comment
          </Button>
        </div>
      ) : null}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={(next) => {
          setReportDialogOpen(next);
          if (!next) setReportCommentId(null);
        }}
        title="Report Comment"
        targetLabel={
          reportCommentId
            ? (() => {
              const found = thread?.comments.find((c) => c.id === reportCommentId);
              if (!found) return "Comment";
              const excerpt = found.body.length > 60 ? `${found.body.slice(0, 60)}...` : found.body;
              return `@${found.authorUsername}: ${excerpt}`;
            })()
            : "Comment"
        }
        reasons={[...COMMENT_REPORT_REASONS]}
        reason={reportReason}
        onReasonChange={(next) => setReportReason(next as "SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "OTHER")}
        details={reportDetails}
        onDetailsChange={setReportDetails}
        submitting={Boolean(reportCommentId && workingCommentId === reportCommentId)}
        onSubmit={() => void onSubmitReportComment()}
      />
    </div>
  );
}
