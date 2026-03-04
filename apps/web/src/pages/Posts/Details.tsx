import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Ellipsis, Flag, Heart, MessageCircle, Repeat2, Reply, Trash2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReviewCard from "@/components/feed/ReviewCard";
import InlineSpinner from "@/components/ui/inline-spinner";
import ReportDialog from "@/components/ui/report-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getMe } from "@/lib/api/me";
import {
  createReviewComment as createPostComment,
  deleteReview as deletePost,
  deleteReviewComment as deletePostComment,
  getReviewThread as getPostThread,
  likeReview as likePost,
  repostReview as repostPost,
  reportReview as reportPost,
  reportReviewComment as reportPostComment,
  unlikeReview as unlikePost,
  unrepostReview as unrepostPost,
} from "@/lib/api/reviews";
import type { FeedItem, ReviewCommentItem as PostCommentItem } from "@/lib/api/types";

const DEFAULT_AVATAR_IMG = "/stacta.png";

const COMMENT_REPORT_REASONS = [
  { value: "INAPPROPRIATE", label: "Inappropriate" },
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "OTHER", label: "Other" },
] as const;

const POST_REPORT_REASONS = [
  { value: "INAPPROPRIATE", label: "Inappropriate" },
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "OTHER", label: "Other" },
] as const;

type ScentSelection = {
  source: "FRAGELLA" | "COMMUNITY";
  externalId: string;
  name: string;
};

type PostThreadResponse = {
  post: FeedItem;
  comments: PostCommentItem[];
};

function parseScentSelections(payload: string | null | undefined): ScentSelection[] {
  if (!payload) return [];
  try {
    const parsed = JSON.parse(payload) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const source: "FRAGELLA" | "COMMUNITY" =
          String(item.source ?? "").toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
        return {
          source,
          externalId: String(item.externalId ?? "").trim(),
          name: String(item.name ?? "").trim(),
        };
      })
      .filter((item) => item.externalId && item.name)
      .slice(0, 3);
  } catch {
    return [];
  }
}

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

function postTypeLabel(type: string) {
  if (type === "SCENT_POSTED") return "Scent of the day";
  if (type === "REVIEW_POSTED" || type === "REVIEW_REPOSTED") return "Review";
  if (type === "QUESTION_POSTED") return "Question";
  if (type === "GENERAL_POSTED") return "General";
  return "Post";
}

function ThreadSkeleton() {
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-black/25 p-4">
        <div className="stacta-skeleton-sheen pointer-events-none absolute inset-0" />
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-white/12" />
            <div className="h-3 w-40 rounded-full bg-white/12" />
          </div>
          <div className="h-3 w-full rounded-full bg-white/10" />
          <div className="h-3 w-11/12 rounded-full bg-white/8" />
        </div>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-black/25 p-4">
        <div className="stacta-skeleton-sheen pointer-events-none absolute inset-0" />
        <div className="animate-pulse space-y-2.5">
          <div className="h-4 w-32 rounded-full bg-white/12" />
          <div className="h-24 w-full rounded-xl bg-white/8" />
        </div>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={`comment-skeleton-${idx}`}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3"
            style={{ animationDelay: `${Math.min(idx * 45, 180)}ms` }}
          >
            <div className="stacta-skeleton-sheen pointer-events-none absolute inset-0" />
            <div className="animate-pulse space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/12" />
                <div className="h-3 w-36 rounded-full bg-white/12" />
              </div>
              <div className="h-3 w-full rounded-full bg-white/10" />
              <div className="h-3 w-4/5 rounded-full bg-white/8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

export default function PostDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { postId = "" } = useParams<{ postId: string }>();
  const backTarget = (location.state as any)?.from?.pathname || "/home";

  const [loading, setLoading] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<PostThreadResponse | null>(null);
  const [viewerUsername, setViewerUsername] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyTarget, setReplyTarget] = useState<PostCommentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [workingCommentId, setWorkingCommentId] = useState<string | null>(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<"SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "OTHER">("INAPPROPRIATE");
  const [reportDetails, setReportDetails] = useState("");
  const [postReportDialogOpen, setPostReportDialogOpen] = useState(false);
  const [postReportReason, setPostReportReason] = useState<"SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "OTHER">("INAPPROPRIATE");
  const [postReportDetails, setPostReportDetails] = useState("");
  const [reportingPost, setReportingPost] = useState(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [repostingPostId, setRepostingPostId] = useState<string | null>(null);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const composerRef = useRef<HTMLElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const threadMenuRef = useRef<HTMLDivElement | null>(null);

  const loadPostThread = useCallback(async () => {
    if (!postId) return;
    setContentVisible(false);
    setLoading(true);
    setError(null);
    try {
      const data = await getPostThread(postId);
      const normalized: PostThreadResponse = {
        post: data.review,
        comments: data.comments,
      };
      setThread(normalized);
    } catch (e: any) {
      setError(e?.message || "Failed to load comments.");
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void loadPostThread();
  }, [loadPostThread]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [postId]);

  useEffect(() => {
    if (loading) return;
    const timeout = window.setTimeout(() => setContentVisible(true), 32);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setViewerUsername(me.username ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setViewerUsername(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const node = threadMenuRef.current;
      if (!node) return;
      if (node.contains(event.target as Node)) return;
      setThreadMenuOpen(false);
    }
    if (threadMenuOpen) document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [threadMenuOpen]);

  const commentsByParent = useMemo(() => {
    const grouped = new Map<string | null, PostCommentItem[]>();
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
    if (!thread?.post?.id || !body || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPostComment(thread.post.id, {
        body,
        parentCommentId: replyTarget?.id ?? null,
      });
      setNewComment("");
      setReplyTarget(null);
      await loadPostThread();
    } catch (e: any) {
      setError(e?.message || "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteComment(commentId: string) {
    if (!thread?.post?.id || !commentId) return;
    if (!window.confirm("Delete this comment? Replies under it will also be removed.")) return;
    setWorkingCommentId(commentId);
    setOpenMenuCommentId(null);
    setError(null);
    try {
      await deletePostComment(thread.post.id, commentId);
      await loadPostThread();
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
    if (!thread?.post?.id || !reportCommentId) return;
    setWorkingCommentId(reportCommentId);
    setError(null);
    try {
      await reportPostComment(thread.post.id, reportCommentId, {
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

  async function onTogglePostLike(postId: string, currentlyLiked: boolean, actorUsername?: string) {
    if (!postId || likingPostId === postId) return;
    if (!viewerUsername) return;
    if (actorUsername && actorUsername.toLowerCase() === viewerUsername.toLowerCase()) return;
    setLikingPostId(postId);
    setThread((prev) => {
      if (!prev || prev.post.sourceReviewId !== postId) return prev;
      const nextLikes = Math.max(0, prev.post.likesCount + (currentlyLiked ? -1 : 1));
      return { ...prev, post: { ...prev.post, viewerHasLiked: !currentlyLiked, likesCount: nextLikes } };
    });
    try {
      const res = currentlyLiked ? await unlikePost(postId) : await likePost(postId);
      setThread((prev) => {
        if (!prev || prev.post.sourceReviewId !== postId) return prev;
        return { ...prev, post: { ...prev.post, viewerHasLiked: res.viewerHasLiked, likesCount: res.likesCount } };
      });
    } catch (e: any) {
      setThread((prev) => {
        if (!prev || prev.post.sourceReviewId !== postId) return prev;
        const revertedLikes = Math.max(0, prev.post.likesCount + (currentlyLiked ? 1 : -1));
        return { ...prev, post: { ...prev.post, viewerHasLiked: currentlyLiked, likesCount: revertedLikes } };
      });
      setError(e?.message || "Failed to update like.");
    } finally {
      setLikingPostId(null);
    }
  }

  async function onTogglePostRepost(postId: string, currentlyReposted: boolean, actorUsername?: string) {
    if (!postId || repostingPostId === postId) return;
    if (!viewerUsername) return;
    if (actorUsername && actorUsername.toLowerCase() === viewerUsername.toLowerCase()) return;
    setRepostingPostId(postId);
    setThread((prev) => {
      if (!prev || prev.post.sourceReviewId !== postId) return prev;
      const nextReposts = Math.max(0, prev.post.repostsCount + (currentlyReposted ? -1 : 1));
      return { ...prev, post: { ...prev.post, viewerHasReposted: !currentlyReposted, repostsCount: nextReposts } };
    });
    try {
      const res = currentlyReposted ? await unrepostPost(postId) : await repostPost(postId);
      setThread((prev) => {
        if (!prev || prev.post.sourceReviewId !== postId) return prev;
        return { ...prev, post: { ...prev.post, viewerHasReposted: res.viewerHasReposted, repostsCount: res.repostsCount } };
      });
    } catch (e: any) {
      setThread((prev) => {
        if (!prev || prev.post.sourceReviewId !== postId) return prev;
        const revertedReposts = Math.max(0, prev.post.repostsCount + (currentlyReposted ? 1 : -1));
        return { ...prev, post: { ...prev.post, viewerHasReposted: currentlyReposted, repostsCount: revertedReposts } };
      });
      setError(e?.message || "Failed to update repost.");
    } finally {
      setRepostingPostId(null);
    }
  }

  async function onDeleteThreadPost() {
    if (!thread?.post?.sourceReviewId || deletingPost) return;
    setDeletingPost(true);
    setError(null);
    try {
      await deletePost(thread.post.sourceReviewId);
      navigate(backTarget);
    } catch (e: any) {
      setError(e?.message || "Failed to delete post.");
    } finally {
      setDeletingPost(false);
      setThreadMenuOpen(false);
    }
  }

  function onOpenReportPost() {
    setThreadMenuOpen(false);
    setPostReportReason("INAPPROPRIATE");
    setPostReportDetails("");
    setPostReportDialogOpen(true);
  }

  async function onSubmitReportPost() {
    if (!thread?.post?.sourceReviewId || reportingPost) return;
    setReportingPost(true);
    setError(null);
    try {
      await reportPost(thread.post.sourceReviewId, {
        reason: postReportReason,
        details: postReportDetails.trim() || null,
      });
      setPostReportDialogOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to report post.");
    } finally {
      setReportingPost(false);
    }
  }

  function focusComposer() {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      composerInputRef.current?.focus();
    }, 160);
  }

  function startReply(comment: PostCommentItem) {
    setReplyTarget(comment);
    focusComposer();
  }

  function renderComment(comment: PostCommentItem, isReply: boolean) {
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
              <img
                src={comment.authorAvatarUrl?.trim() ? comment.authorAvatarUrl : DEFAULT_AVATAR_IMG}
                alt={`${comment.authorUsername} avatar`}
                className="h-7 w-7 rounded-full border border-white/15 object-cover"
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallbackApplied === "1") return;
                  img.dataset.fallbackApplied = "1";
                  img.src = DEFAULT_AVATAR_IMG;
                }}
              />
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
      <div className="mx-auto -mt-4 max-w-3xl px-4 pb-10">
        <div className="mb-4">
          <div className="grid grid-cols-[40px_1fr_40px] items-center">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
              aria-label="Back"
              onClick={() => navigate(backTarget)}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="text-center text-sm font-semibold text-white/90">
              {thread ? postTypeLabel(thread.post.type) : "Post"}
            </div>
            <div className="relative justify-self-end" ref={threadMenuRef}>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
                aria-label="Post actions"
                onClick={() => setThreadMenuOpen((prev) => !prev)}
              >
                <Ellipsis className="h-4 w-4" />
              </button>
              {threadMenuOpen && thread ? (
                <div className="absolute right-0 z-30 mt-1.5 min-w-[156px] rounded-xl border border-white/15 bg-[#101114]/95 p-1.5 shadow-[0_14px_28px_rgba(0,0,0,0.45)] backdrop-blur">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/85 transition hover:bg-white/10"
                    onClick={() => {
                      setThreadMenuOpen(false);
                      navigate(`/u/${thread.post.actorUsername}`);
                    }}
                  >
                    <span>View profile</span>
                  </button>
                  {viewerUsername && thread.post.actorUsername.toLowerCase() === viewerUsername.toLowerCase() ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-200 transition hover:bg-red-500/10"
                      onClick={() => void onDeleteThreadPost()}
                      disabled={deletingPost}
                    >
                      <span>{deletingPost ? "Deleting..." : "Delete post"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/85 transition hover:bg-white/10"
                      onClick={onOpenReportPost}
                    >
                      <Flag className="h-3.5 w-3.5" />
                      <span>Report post</span>
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
        ) : null}

        {loading ? (
          <ThreadSkeleton />
        ) : !thread ? (
          <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white/65">
            Post not found.
          </div>
        ) : (
          <div className={["space-y-4 transition-all duration-500", contentVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"].join(" ")}>
            {thread.post.type === "SCENT_POSTED" ? (
              <article className="rounded-3xl border border-white/15 bg-[linear-gradient(140deg,rgba(34,211,238,0.08),rgba(244,114,182,0.07),rgba(0,0,0,0.28))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="flex min-w-0 items-center gap-2 text-left"
                    onClick={() => navigate(`/u/${thread.post.actorUsername}`)}
                  >
                    <img
                      src={thread.post.actorAvatarUrl?.trim() ? thread.post.actorAvatarUrl : DEFAULT_AVATAR_IMG}
                      alt={`${thread.post.actorUsername} avatar`}
                      className="h-9 w-9 rounded-full border border-white/15 object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallbackApplied === "1") return;
                        img.dataset.fallbackApplied = "1";
                        img.src = DEFAULT_AVATAR_IMG;
                      }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {thread.post.actorDisplayName || thread.post.actorUsername}
                      </div>
                      <div className="truncate text-xs text-white/60">@{thread.post.actorUsername}</div>
                    </div>
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {parseScentSelections(thread.post.reviewPerformance).map((scent) => (
                    <button
                      key={`${thread.post.id}:${scent.source}:${scent.externalId}`}
                      type="button"
                      className="rounded-full border border-cyan-200/40 bg-gradient-to-r from-cyan-300/20 via-white/10 to-amber-300/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-cyan-300/30 hover:via-white/15 hover:to-amber-300/30"
                      onClick={() => navigate(`/fragrances/${encodeURIComponent(scent.externalId)}?source=${scent.source}`)}
                    >
                      {scent.name}
                    </button>
                  ))}
                </div>
                {thread.post.reviewExcerpt ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{thread.post.reviewExcerpt}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
                  <div>{timeAgo(thread.post.createdAt)}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Like"
                      aria-label="Like post"
                      className="inline-flex h-7 items-center justify-center gap-1 text-white/65 transition hover:text-[#3EB489]"
                      onClick={() => onTogglePostLike(thread.post.sourceReviewId, Boolean(thread.post.viewerHasLiked), thread.post.actorUsername)}
                      disabled={!viewerUsername || likingPostId === thread.post.sourceReviewId || viewerUsername.toLowerCase() === thread.post.actorUsername.toLowerCase()}
                    >
                      <Heart className="h-4 w-4" />
                      <span>{thread.post.likesCount}</span>
                    </button>
                    <span className="inline-flex h-7 items-center justify-center gap-1 text-white/60">
                      <MessageCircle className="h-4 w-4" />
                      <span>{thread.post.commentsCount}</span>
                    </span>
                    <button
                      type="button"
                      title="Repost"
                      aria-label="Repost post"
                      className="inline-flex h-7 items-center justify-center gap-1 text-white/65 transition hover:text-[#3EB489]"
                      onClick={() => onTogglePostRepost(thread.post.sourceReviewId, Boolean(thread.post.viewerHasReposted), thread.post.actorUsername)}
                      disabled={!viewerUsername || repostingPostId === thread.post.sourceReviewId || viewerUsername.toLowerCase() === thread.post.actorUsername.toLowerCase()}
                    >
                      <Repeat2 className="h-4 w-4" />
                      <span>{thread.post.repostsCount}</span>
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              <ReviewCard
                item={thread.post}
                timeAgo={timeAgo(thread.post.createdAt)}
                onOpenUser={() => navigate(`/u/${thread.post.actorUsername}`)}
                onOpenFragrance={() => {
                  if (!thread.post.fragranceExternalId) return;
                  const source = String(thread.post.fragranceSource ?? "FRAGELLA").toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
                  navigate(`/fragrances/${encodeURIComponent(thread.post.fragranceExternalId)}?source=${source}`);
                }}
                onToggleLike={
                  viewerUsername && thread.post.actorUsername.toLowerCase() !== viewerUsername.toLowerCase()
                    ? () => onTogglePostLike(thread.post.sourceReviewId, Boolean(thread.post.viewerHasLiked), thread.post.actorUsername)
                    : undefined
                }
                onToggleRepost={
                  viewerUsername && thread.post.actorUsername.toLowerCase() !== viewerUsername.toLowerCase()
                    ? () => onTogglePostRepost(thread.post.sourceReviewId, Boolean(thread.post.viewerHasReposted), thread.post.actorUsername)
                    : undefined
                }
                liking={likingPostId === thread.post.sourceReviewId}
                reposting={repostingPostId === thread.post.sourceReviewId}
                hideMetaActions
              />
            )}

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
            Reply
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
      <ReportDialog
        open={postReportDialogOpen}
        onOpenChange={setPostReportDialogOpen}
        title="Report Post"
        targetLabel={thread ? `@${thread.post.actorUsername} • ${postTypeLabel(thread.post.type)}` : "Post"}
        reasons={[...POST_REPORT_REASONS]}
        reason={postReportReason}
        onReasonChange={(next) => setPostReportReason(next as "SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "OTHER")}
        details={postReportDetails}
        onDetailsChange={setPostReportDetails}
        submitting={reportingPost}
        onSubmit={() => void onSubmitReportPost()}
      />
    </div>
  );
}
