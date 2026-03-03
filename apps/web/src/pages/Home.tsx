import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Check, Heart, MessageCircle, MoreHorizontal, Paperclip, PenSquare, Repeat2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import ReviewCard from "@/components/feed/ReviewCard";
import { getMe } from "@/lib/api/me";
import { deleteReview, likeReview, repostReview, submitScentPost, unlikeReview, unrepostReview } from "@/lib/api/reviews";
import { listFeed, type FeedFilter, type FeedTab } from "@/lib/api/feed";
import type { CollectionItem, FeedItem } from "@/lib/api/types";
import fragranceFallbackImg from "@/assets/illustrations/NotFound.png";

const DEFAULT_AVATAR_IMG = "/stacta.png";
const FALLBACK_FRAGRANCE_IMG = fragranceFallbackImg;

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

function eventLabel(item: FeedItem) {
  if (item.type === "REVIEW_POSTED") return "posted a review";
  if (item.type === "SCENT_POSTED") return "shared scent of the day";
  if (item.type === "COLLECTION_ITEM_ADDED") return "added to collection";
  if (item.type === "WISHLIST_ITEM_ADDED") return "added to wishlist";
  if (item.type === "REVIEW_REPOSTED") return "reposted a review";
  return "shared activity";
}

function kindPill(type: FeedItem["type"]) {
  if (type === "REVIEW_POSTED") return "Review";
  if (type === "SCENT_POSTED") return "Post";
  if (type === "COLLECTION_ITEM_ADDED") return "Collection";
  if (type === "WISHLIST_ITEM_ADDED") return "Wishlist";
  if (type === "REVIEW_REPOSTED") return "Repost";
  return "Activity";
}

function collectionTagLabel(tag: string | null | undefined) {
  const normalized = String(tag ?? "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "BLIND_BUY") return "Blind Buy";
  if (normalized === "SAMPLED_FIRST") return "Sampled First";
  if (normalized === "RECOMMENDED") return "Recommended";
  if (normalized === "HYPE_TREND") return "Hype/Trend";
  if (normalized === "DEAL_DISCOUNT") return "Deal/Discount";
  if (normalized === "GIFT") return "Gift";
  return null;
}

type ScentSelection = {
  source: "FRAGELLA" | "COMMUNITY";
  externalId: string;
  name: string;
};

type ComposerPostType = "SCENT_OF_DAY" | "QUESTION" | "GENERAL";

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

export default function HomePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeedTab>("FOLLOWING");
  const [filter, setFilter] = useState<FeedFilter>("ALL");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerUsername, setViewerUsername] = useState<string | null>(null);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [composerPostType, setComposerPostType] = useState<ComposerPostType>("GENERAL");
  const [postText, setPostText] = useState("");
  const [selectedScentKeys, setSelectedScentKeys] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [pendingDeleteReviewId, setPendingDeleteReviewId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [likingReviewId, setLikingReviewId] = useState<string | null>(null);
  const [repostingReviewId, setRepostingReviewId] = useState<string | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [postActionMenuId, setPostActionMenuId] = useState<string | null>(null);
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);
  const [mobileScentPickerView, setMobileScentPickerView] = useState(false);
  const [scentPickerOpen, setScentPickerOpen] = useState(false);
  const [composerAttachments, setComposerAttachments] = useState<File[]>([]);
  const [composerPollOpen, setComposerPollOpen] = useState(false);
  const [composerPollOptions, setComposerPollOptions] = useState<string[]>(["", ""]);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  function isDisplayFeedItem(item: FeedItem) {
    return item.type !== "USER_FOLLOWED_USER";
  }

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setViewerUsername(me.username ?? null);
        setCollectionItems(me.collectionItems ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setViewerUsername(null);
        setCollectionItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listFeed({ tab, filter, limit: 20 });
      setItems(page.items.filter(isDisplayFeedItem));
      setCursor(page.nextCursor);
    } catch (e: any) {
      setError(e?.message || "Failed to load feed.");
      setItems([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, [filter, tab]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!filterMenuRef.current) return;
      if (filterMenuRef.current.contains(event.target as Node)) return;
      setFilterMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-post-menu-root='true']")) return;
      setPostActionMenuId(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await listFeed({ tab, filter, limit: 20, cursor });
      setItems((prev) => [...prev, ...page.items.filter(isDisplayFeedItem)]);
      setCursor(page.nextCursor);
    } catch (e: any) {
      setError(e?.message || "Failed to load more feed items.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function onDeleteReview(reviewId: string) {
    if (!reviewId) return;
    setDeletingReviewId(reviewId);
    setError(null);
    try {
      await deleteReview(reviewId);
      setItems((prev) => prev.filter((x) => x.id !== reviewId));
    } catch (e: any) {
      setError(e?.message || "Failed to delete review.");
    } finally {
      setDeletingReviewId(null);
      setPendingDeleteReviewId(null);
    }
  }

  async function onToggleReviewLike(reviewId: string, currentlyLiked: boolean, actorUsername?: string) {
    if (!reviewId || likingReviewId === reviewId) return;
    if (!viewerUsername) return;
    if (actorUsername && actorUsername.toLowerCase() === viewerUsername.toLowerCase()) return;
    setLikingReviewId(reviewId);
    setItems((prev) => prev.map((item) => {
      if (item.sourceReviewId !== reviewId) return item;
      const nextLikes = Math.max(0, item.likesCount + (currentlyLiked ? -1 : 1));
      return { ...item, viewerHasLiked: !currentlyLiked, likesCount: nextLikes };
    }));
    try {
      const res = currentlyLiked ? await unlikeReview(reviewId) : await likeReview(reviewId);
      setItems((prev) => prev.map((item) => (
        item.sourceReviewId === reviewId
          ? { ...item, viewerHasLiked: res.viewerHasLiked, likesCount: res.likesCount }
          : item
      )));
    } catch (e: any) {
      setItems((prev) => prev.map((item) => {
        if (item.sourceReviewId !== reviewId) return item;
        const revertedLikes = Math.max(0, item.likesCount + (currentlyLiked ? 1 : -1));
        return { ...item, viewerHasLiked: currentlyLiked, likesCount: revertedLikes };
      }));
      setError(e?.message || "Failed to update like.");
    } finally {
      setLikingReviewId(null);
    }
  }

  async function onToggleReviewRepost(reviewId: string, currentlyReposted: boolean, actorUsername?: string) {
    if (!reviewId || repostingReviewId === reviewId) return;
    if (!viewerUsername) return;
    if (actorUsername && actorUsername.toLowerCase() === viewerUsername.toLowerCase()) return;
    setRepostingReviewId(reviewId);
    setItems((prev) => prev.map((item) => {
      if (item.sourceReviewId !== reviewId) return item;
      const nextReposts = Math.max(0, item.repostsCount + (currentlyReposted ? -1 : 1));
      return { ...item, viewerHasReposted: !currentlyReposted, repostsCount: nextReposts };
    }));
    try {
      const res = currentlyReposted ? await unrepostReview(reviewId) : await repostReview(reviewId);
      setItems((prev) => prev.map((item) => (
        item.sourceReviewId === reviewId
          ? { ...item, viewerHasReposted: res.viewerHasReposted, repostsCount: res.repostsCount }
          : item
      )));
    } catch (e: any) {
      setItems((prev) => prev.map((item) => {
        if (item.sourceReviewId !== reviewId) return item;
        const revertedReposts = Math.max(0, item.repostsCount + (currentlyReposted ? 1 : -1));
        return { ...item, viewerHasReposted: currentlyReposted, repostsCount: revertedReposts };
      }));
      setError(e?.message || "Failed to update repost.");
    } finally {
      setRepostingReviewId(null);
    }
  }

  const selectedScents = useMemo(() => {
    const selectedSet = new Set(selectedScentKeys);
    return collectionItems.filter((item) => selectedSet.has(`${item.source.toUpperCase()}:${item.externalId}`));
  }, [collectionItems, selectedScentKeys]);

  function toggleScent(item: CollectionItem) {
    const key = `${item.source.toUpperCase()}:${item.externalId}`;
    setSelectedScentKeys((prev) => {
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }

  async function onSubmitScentPost() {
    if (!selectedScents.length || posting) return;
    setPosting(true);
    setError(null);
    try {
      await submitScentPost({
        text: postText.trim() || null,
        scents: selectedScents.map((item) => ({
          source: item.source.toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA",
          externalId: item.externalId,
        })),
      });
      setComposerPostType("GENERAL");
      setPostText("");
      setSelectedScentKeys([]);
      setComposerAttachments([]);
      setComposerPollOpen(false);
      setComposerPollOptions(["", ""]);
      setMobileComposerOpen(false);
      setMobileScentPickerView(false);
      setScentPickerOpen(false);
      await loadFeed();
    } catch (e: any) {
      setError(e?.message || "Failed to post scent of the day.");
    } finally {
      setPosting(false);
    }
  }

  const filterOptions: Array<{ value: FeedFilter; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "REVIEW_POSTED", label: "Reviews" },
    { value: "SCENT_POSTED", label: "Posts" },
    { value: "COLLECTION_ITEM_ADDED", label: "Collection" },
    { value: "WISHLIST_ITEM_ADDED", label: "Wishlist" },
  ];

  const composerTypeOptions: Array<{ value: ComposerPostType; label: string; description: string }> = [
    { value: "GENERAL", label: "General", description: "Quick status, thought, or update." },
    { value: "SCENT_OF_DAY", label: "Scent of day", description: "Pick up to three fragrances from your collection." },
    { value: "QUESTION", label: "Question", description: "Ask for feedback, advice, or opinions." },
  ];
  const selectedComposerType = composerTypeOptions.find((option) => option.value === composerPostType) ?? composerTypeOptions[0];
  const selectedFilterLabel = filterOptions.find((option) => option.value === filter)?.label ?? "All";
  function applyFilter(next: FeedFilter) {
    setFilter(next);
    setFilterMenuOpen(false);
    setMobileFilterOpen(false);
  }
  function openScentPicker() {
    if (mobileComposerOpen) {
      setMobileScentPickerView(true);
      return;
    }
    setScentPickerOpen(true);
  }
  function closeScentPicker() {
    setScentPickerOpen(false);
  }

  function onAttachmentPick(fileList: FileList | null) {
    if (!fileList?.length) return;
    const picked = Array.from(fileList).slice(0, 4);
    setComposerAttachments((prev) => [...prev, ...picked].slice(0, 4));
  }

  function onRemoveAttachment(index: number) {
    setComposerAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function onUpdatePollOption(index: number, value: string) {
    setComposerPollOptions((prev) => prev.map((option, i) => (i === index ? value : option)));
  }

  function onAddPollOption() {
    setComposerPollOptions((prev) => (prev.length >= 4 ? prev : [...prev, ""]));
  }

  function onRemovePollOption(index: number) {
    setComposerPollOptions((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  const composerForm = (
    <>
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.14em] text-white/55">Create post</div>
        <div className="no-scrollbar overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {composerTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  composerPostType === option.value
                    ? "border-cyan-300/55 bg-cyan-300/16 text-cyan-50"
                    : "border-white/18 bg-white/5 text-white/80 hover:bg-white/10",
                ].join(" ")}
                onClick={() => setComposerPostType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/60">{selectedComposerType.description}</div>
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          maxLength={1200}
          placeholder={
            composerPostType === "SCENT_OF_DAY"
              ? "What are you wearing today?"
              : "What do you want to share?"
          }
          className="min-h-28 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/45"
        />
        <div className="flex flex-col gap-2 text-[11px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/65 transition hover:bg-white/5 hover:text-cyan-100"
              aria-label="Attach image"
              title="Attach image"
              onClick={() => attachmentInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded-md px-1.5 text-xs font-semibold transition",
                composerPollOpen
                  ? "text-cyan-100"
                  : "text-white/65 hover:bg-white/5 hover:text-cyan-100",
              ].join(" ")}
              aria-label="Add poll"
              onClick={() => {
                setComposerPollOpen((prev) => !prev);
                if (composerPostType !== "QUESTION") setComposerPostType("QUESTION");
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Poll</span>
            </button>
          </div>
          <div>{postText.trim().length}/1200</div>
        </div>
        {composerAttachments.length ? (
          <div className="flex flex-wrap gap-2">
            {composerAttachments.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-xs text-white/80"
              >
                <Paperclip className="h-3.5 w-3.5 text-cyan-200" />
                <span className="max-w-[200px] truncate">{file.name}</span>
                <button
                  type="button"
                  className="text-white/65 transition hover:text-white"
                  aria-label={`Remove attachment ${file.name}`}
                  onClick={() => onRemoveAttachment(idx)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {composerPollOpen ? (
          <div className="space-y-2 rounded-xl border border-white/12 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.12em] text-white/60">Poll options</div>
              {composerPollOptions.length < 4 ? (
                <button
                  type="button"
                  className="text-xs text-cyan-100/80 transition hover:text-cyan-100"
                  onClick={onAddPollOption}
                >
                  Add option
                </button>
              ) : null}
            </div>
            {composerPollOptions.map((option, index) => (
              <div key={`poll-option-${index}`} className="flex items-center gap-2">
                <input
                  value={option}
                  onChange={(e) => onUpdatePollOption(index, e.target.value)}
                  maxLength={80}
                  placeholder={`Option ${index + 1}`}
                  className="h-9 w-full rounded-lg border border-white/12 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-cyan-300/45"
                />
                {composerPollOptions.length > 2 ? (
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() => onRemovePollOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <input
          ref={attachmentInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            onAttachmentPick(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        <div className="text-[11px] text-white/45">
          {composerPostType !== "SCENT_OF_DAY"
            ? "General, question, attachments, and poll publishing will be wired next."
            : "Image uploads and poll publishing for scent posts are coming next."}
        </div>
      </div>

      {composerPostType === "SCENT_OF_DAY" ? (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-[0.12em] text-white/60">Select up to 3 fragrances</div>
            <div className="text-xs text-cyan-100/75">{selectedScents.length}/3 selected</div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/18"
              onClick={openScentPicker}
              disabled={!collectionItems.length}
            >
              Select fragrances
            </Button>
            {selectedScents.length ? (
              <button
                type="button"
                className="text-xs text-white/60 transition hover:text-white"
                onClick={() => setSelectedScentKeys([])}
              >
                Clear selection
              </button>
            ) : null}
          </div>
          {!collectionItems.length ? (
            <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
              Add fragrances to your collection first.
            </div>
          ) : !selectedScents.length ? (
            <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
              No fragrances selected yet.
            </div>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {selectedScents.map((item) => {
                const key = `${item.source.toUpperCase()}:${item.externalId}`;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl border border-cyan-300/35 bg-cyan-300/12 px-3 py-2 text-left"
                  >
                    <img
                      src={item.imageUrl?.trim() ? item.imageUrl : FALLBACK_FRAGRANCE_IMG}
                      alt={item.name}
                      className="h-12 w-12 rounded-lg border border-white/15 object-cover bg-white/5"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.fallbackApplied === "1") return;
                        img.dataset.fallbackApplied = "1";
                        img.src = FALLBACK_FRAGRANCE_IMG;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white/95">{item.name}</div>
                      <div className="truncate text-xs text-white/65">{item.brand || "—"}</div>
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/70 transition hover:bg-white/10 hover:text-white"
                      onClick={() => toggleScent(item)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-3 hidden md:flex md:justify-end">
        <Button
          className="h-9 rounded-xl px-4"
          disabled={posting || composerPostType !== "SCENT_OF_DAY" || !selectedScents.length}
          onClick={() => {
            if (composerPostType !== "SCENT_OF_DAY") return;
            void onSubmitScentPost();
          }}
        >
          {posting ? (
            <span className="inline-flex items-center gap-2">
              <InlineSpinner className="h-3.5 w-3.5" />
              <span>Posting</span>
            </span>
          ) : composerPostType === "SCENT_OF_DAY" ? "Post scent of the day" : "Coming soon"}
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto -mt-6 max-w-7xl px-4 pb-10">
        <div className="mb-4">
          <div className="mb-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/10 pb-1">
            <div aria-hidden="true" />
            <div className="no-scrollbar overflow-x-auto justify-self-center" role="tablist" aria-label="Feed scope">
              <div className="flex min-w-max items-center gap-6 px-1">
                {[
                  { id: "FOLLOWING" as const, label: "Following" },
                  { id: "POPULAR" as const, label: "Popular" },
                ].map((homeTab) => (
                  <button
                    key={homeTab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === homeTab.id}
                    onClick={() => setTab(homeTab.id)}
                    className={[
                      "group relative inline-flex items-center gap-2 py-3 text-sm font-medium transition",
                      tab === homeTab.id ? "text-white" : "text-white/65 hover:text-white",
                    ].join(" ")}
                  >
                    <span className={tab === homeTab.id ? "text-cyan-200" : "text-white/45 group-hover:text-white/75"}>
                      {homeTab.id === "FOLLOWING" ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 14c-2.7 0-5 1.3-5 3v2h10v-2c0-1.7-2.3-3-5-3zM16 12c-2 0-4 1-4 2.5V19h9v-1.5c0-1.5-2.2-2.5-5-2.5z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 19h16M6 15h3M11 11h3M16 7h2" />
                        </svg>
                      )}
                    </span>
                    <span>{homeTab.label}</span>
                    <span
                      className={[
                        "absolute -bottom-px left-0 right-0 h-[2px] rounded-full transition-all duration-200",
                        tab === homeTab.id ? "bg-cyan-300/95" : "bg-transparent group-hover:bg-white/30",
                      ].join(" ")}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div ref={filterMenuRef} className="relative shrink-0 justify-self-end">
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/16"
                onClick={() => {
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    setMobileFilterOpen(true);
                    return;
                  }
                  setFilterMenuOpen((prev) => !prev);
                }}
                aria-expanded={filterMenuOpen || mobileFilterOpen}
                aria-haspopup="menu"
              >
                <SlidersHorizontal className="h-4 w-4 text-cyan-200" />
                <span>{selectedFilterLabel}</span>
              </button>
              {filterMenuOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-white/15 bg-[#101114]/95 p-1.5 shadow-[0_14px_28px_rgba(0,0,0,0.45)] backdrop-blur">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/85 transition hover:bg-white/10"
                      onClick={() => applyFilter(option.value)}
                    >
                      <span>{option.label}</span>
                      {filter === option.value ? <Check className="h-3.5 w-3.5 text-cyan-200" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mb-4 hidden border-b border-white/10 pb-4 md:block">
          <div>{composerForm}</div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            {loading ? (
              <div className="rounded-3xl border border-white/15 bg-black/25 p-6">
                <LoadingSpinner label="Loading feed..." />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-3xl border border-white/15 bg-black/25 p-6 text-sm text-white/70">
                No feed items yet for this view.
              </div>
            ) : (
              items.map((item, idx) => (
                item.type === "REVIEW_POSTED" || item.type === "REVIEW_REPOSTED" ? (
                  <ReviewCard
                    key={item.id}
                    item={item}
                    timeAgo={timeAgo(item.createdAt)}
                    onOpenUser={() => navigate(`/u/${item.actorUsername}`, { state: { from: { pathname: "/home" } } })}
                    onOpenRepostActor={
                      item.repostActorUsername
                        ? () => navigate(`/u/${item.repostActorUsername}`, { state: { from: { pathname: "/home" } } })
                        : undefined
                    }
                    onOpenFragrance={() => {
                      const source = String(item.fragranceSource ?? "FRAGELLA").toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
                      const externalId = String(item.fragranceExternalId ?? "").trim();
                      if (!externalId) return;
                      navigate(`/fragrances/${encodeURIComponent(externalId)}?source=${source}`, {
                        state: {
                          fragrance: {
                            source,
                            externalId,
                            name: item.fragranceName,
                            brand: null,
                            imageUrl: item.fragranceImageUrl,
                          },
                          from: { pathname: "/home" },
                        },
                      });
                    }}
                    onDelete={
                      viewerUsername
                      && item.type === "REVIEW_POSTED"
                      && item.actorUsername.toLowerCase() === viewerUsername.toLowerCase()
                        ? () => setPendingDeleteReviewId(item.id)
                        : undefined
                    }
                    onToggleLike={
                      viewerUsername && item.actorUsername.toLowerCase() !== viewerUsername.toLowerCase()
                        ? () => onToggleReviewLike(item.sourceReviewId, Boolean(item.viewerHasLiked), item.actorUsername)
                        : undefined
                    }
                    onToggleRepost={
                      viewerUsername && item.actorUsername.toLowerCase() !== viewerUsername.toLowerCase()
                        ? () => onToggleReviewRepost(item.sourceReviewId, Boolean(item.viewerHasReposted), item.actorUsername)
                        : undefined
                    }
                    onOpenComments={() => navigate(`/posts/${encodeURIComponent(item.sourceReviewId)}`, { state: { from: { pathname: "/home" } } })}
                    liking={likingReviewId === item.sourceReviewId}
                    reposting={repostingReviewId === item.sourceReviewId}
                    deleting={deletingReviewId === item.id}
                  />
                ) : item.type === "SCENT_POSTED" ? (
                  <article
                    key={item.id}
                    className="cursor-pointer rounded-3xl border border-white/15 bg-[linear-gradient(140deg,rgba(34,211,238,0.08),rgba(244,114,182,0.07),rgba(0,0,0,0.28))] p-4"
                    style={{ animationDelay: `${Math.min(idx * 28, 260)}ms` }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement | null;
                      if (target?.closest("button,a,input,textarea,select,[role='button']")) return;
                      navigate(`/posts/${encodeURIComponent(item.sourceReviewId)}`, { state: { from: { pathname: "/home" } } });
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        className="flex min-w-0 items-center gap-2 text-left"
                        onClick={() => navigate(`/u/${item.actorUsername}`, { state: { from: { pathname: "/home" } } })}
                      >
                        <img
                          src={item.actorAvatarUrl?.trim() ? item.actorAvatarUrl : DEFAULT_AVATAR_IMG}
                          alt={`${item.actorUsername} avatar`}
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
                          <div className="truncate text-sm font-semibold text-white">{item.actorDisplayName || item.actorUsername}</div>
                          <div className="truncate text-xs text-white/60">@{item.actorUsername}</div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-100">
                          Scent of the day
                        </span>
                        <div className="relative" data-post-menu-root="true">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white"
                            aria-label="Post actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPostActionMenuId((prev) => (prev === item.id ? null : item.id));
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {postActionMenuId === item.id ? (
                            <div className="absolute right-0 z-30 mt-1.5 min-w-[148px] rounded-xl border border-white/15 bg-[#101114]/95 p-1.5 shadow-[0_14px_28px_rgba(0,0,0,0.45)] backdrop-blur">
                              <button
                                type="button"
                                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/85 transition hover:bg-white/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPostActionMenuId(null);
                                  navigate(`/posts/${encodeURIComponent(item.sourceReviewId)}`, { state: { from: { pathname: "/home" } } });
                                }}
                              >
                                <span>View post</span>
                              </button>
                              {viewerUsername && item.actorUsername.toLowerCase() === viewerUsername.toLowerCase() ? (
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-200 transition hover:bg-red-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPostActionMenuId(null);
                                    setPendingDeleteReviewId(item.sourceReviewId);
                                  }}
                                >
                                  <span>Delete post</span>
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {parseScentSelections(item.reviewPerformance).map((scent) => (
                        <button
                          key={`${item.id}:${scent.source}:${scent.externalId}`}
                          type="button"
                          className="rounded-full border border-cyan-200/40 bg-gradient-to-r from-cyan-300/20 via-white/10 to-amber-300/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-cyan-300/30 hover:via-white/15 hover:to-amber-300/30"
                          onClick={() => navigate(`/fragrances/${encodeURIComponent(scent.externalId)}?source=${scent.source}`, {
                            state: {
                              fragrance: {
                                source: scent.source,
                                externalId: scent.externalId,
                                name: scent.name,
                                brand: null,
                                imageUrl: null,
                              },
                              from: { pathname: "/home" },
                            },
                          })}
                        >
                          {scent.name}
                        </button>
                      ))}
                    </div>
                    {item.reviewExcerpt ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{item.reviewExcerpt}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
                      <div>{timeAgo(item.createdAt)}</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Like"
                          aria-label="Like post"
                          className="inline-flex h-7 items-center justify-center gap-1 text-white/65 transition hover:text-[#3EB489]"
                          onClick={() => onToggleReviewLike(item.sourceReviewId, Boolean(item.viewerHasLiked), item.actorUsername)}
                          disabled={!viewerUsername || likingReviewId === item.sourceReviewId || (viewerUsername.toLowerCase() === item.actorUsername.toLowerCase())}
                        >
                          <Heart className="h-4 w-4" />
                          <span>{item.likesCount}</span>
                        </button>
                        <button
                          type="button"
                          title="Comment"
                          aria-label="Comment on post"
                          className="inline-flex h-7 items-center justify-center gap-1 text-white/65 transition hover:text-[#3EB489]"
                          onClick={() => navigate(`/posts/${encodeURIComponent(item.sourceReviewId)}`, { state: { from: { pathname: "/home" } } })}
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>{item.commentsCount}</span>
                        </button>
                        <button
                          type="button"
                          title="Repost"
                          aria-label="Repost post"
                          className="inline-flex h-7 items-center justify-center gap-1 text-white/65 transition hover:text-[#3EB489]"
                          onClick={() => onToggleReviewRepost(item.sourceReviewId, Boolean(item.viewerHasReposted), item.actorUsername)}
                          disabled={!viewerUsername || repostingReviewId === item.sourceReviewId || (viewerUsername.toLowerCase() === item.actorUsername.toLowerCase())}
                        >
                          <Repeat2 className="h-4 w-4" />
                          <span>{item.repostsCount}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ) : (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-white/15 bg-black/25 p-4"
                    style={{ animationDelay: `${Math.min(idx * 28, 260)}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        className="flex min-w-0 items-center gap-2 text-left"
                        onClick={() => navigate(`/u/${item.actorUsername}`, { state: { from: { pathname: "/home" } } })}
                      >
                        <img
                          src={item.actorAvatarUrl?.trim() ? item.actorAvatarUrl : DEFAULT_AVATAR_IMG}
                          alt={`${item.actorUsername} avatar`}
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
                          <div className="truncate text-sm font-semibold text-white">{item.actorDisplayName || item.actorUsername}</div>
                          <div className="truncate text-xs text-white/60">@{item.actorUsername}</div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                          {kindPill(item.type)}
                        </span>
                        {item.sourceReviewId ? (
                          <div className="relative" data-post-menu-root="true">
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white"
                              aria-label="Post actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPostActionMenuId((prev) => (prev === item.id ? null : item.id));
                              }}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {postActionMenuId === item.id ? (
                              <div className="absolute right-0 z-30 mt-1.5 min-w-[148px] rounded-xl border border-white/15 bg-[#101114]/95 p-1.5 shadow-[0_14px_28px_rgba(0,0,0,0.45)] backdrop-blur">
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/85 transition hover:bg-white/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPostActionMenuId(null);
                                    navigate(`/posts/${encodeURIComponent(item.sourceReviewId)}`, { state: { from: { pathname: "/home" } } });
                                  }}
                                >
                                  <span>View post</span>
                                </button>
                                {viewerUsername && item.actorUsername.toLowerCase() === viewerUsername.toLowerCase() ? (
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-200 transition hover:bg-red-500/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPostActionMenuId(null);
                                      setPendingDeleteReviewId(item.sourceReviewId);
                                    }}
                                  >
                                    <span>Delete post</span>
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-white/85">
                      <span className="font-semibold">{item.actorDisplayName || item.actorUsername}</span> {eventLabel(item)}{" "}
                      <span className="font-semibold text-amber-100">{item.fragranceName || "a fragrance"}</span>
                      {item.type === "COLLECTION_ITEM_ADDED" && collectionTagLabel(item.collectionTag) ? (
                        <span className="ml-2 inline-flex items-center rounded-full border border-[#3EB489]/45 bg-[#3EB489]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9de2ca]">
                          {collectionTagLabel(item.collectionTag)}
                        </span>
                      ) : null}
                      .
                    </div>

                    {item.reviewExcerpt ? (
                      <p className="mt-2 rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white/75">{item.reviewExcerpt}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
                      <div>{timeAgo(item.createdAt)}</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Like"
                          aria-label="Like activity"
                          className="inline-flex h-7 w-7 items-center justify-center text-white/65 transition hover:text-[#3EB489]"
                        >
                          <Heart className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Comment"
                          aria-label="Comment on activity"
                          className="inline-flex h-7 w-7 items-center justify-center text-white/65 transition hover:text-[#3EB489]"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Repost"
                          aria-label="Repost activity"
                          className="inline-flex h-7 w-7 items-center justify-center text-white/65 transition hover:text-[#3EB489]"
                        >
                          <Repeat2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              ))
            )}

            {cursor ? (
              <Button
                variant="secondary"
                className="h-10 w-full rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <InlineSpinner />
                    <span>Loading</span>
                  </span>
                ) : "Load more"}
              </Button>
            ) : null}
          </section>

          <aside className="space-y-3">
            <div className="rounded-3xl border border-white/15 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-white/55">Feed focus</div>
              <div className="mt-2 space-y-2 text-sm text-white/75">
                <div>Prioritize reviews and adds to collection/wishlist.</div>
                <div>Collapse repetitive low-signal events.</div>
                <div>Favor high-signal posts and reviews.</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-white/55">Quick actions</div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button
                  variant="secondary"
                  className="h-9 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                  onClick={() => navigate("/search")}
                >
                  Find fragrance
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                  onClick={() => navigate("/users")}
                >
                  Find people
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                  onClick={() => navigate("/profile")}
                >
                  My profile
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <button
        type="button"
        className="fixed bottom-20 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-cyan-200/45 bg-cyan-300/20 text-cyan-50 shadow-[0_14px_34px_rgba(34,211,238,0.25)] transition hover:bg-cyan-300/30 md:hidden"
        onClick={() => {
          setMobileScentPickerView(false);
          setMobileComposerOpen(true);
        }}
        aria-label="Create post"
        title="Create post"
      >
        <PenSquare className="h-6 w-6" />
      </button>
      <Dialog open={mobileComposerOpen} onOpenChange={setMobileComposerOpen}>
        <DialogContent className="h-screen w-screen max-w-none rounded-none border-0 bg-[#090a0f] p-0 text-white md:hidden [&>button]:hidden">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center text-white/80 transition hover:text-white"
                onClick={() => {
                  if (mobileScentPickerView) {
                    setMobileScentPickerView(false);
                    return;
                  }
                  setMobileComposerOpen(false);
                }}
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-semibold">{mobileScentPickerView ? "Select fragrances" : "Create post"}</div>
              {mobileScentPickerView ? (
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-lg border border-cyan-300/35 bg-cyan-300/18 px-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/28"
                  onClick={() => setMobileScentPickerView(false)}
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-lg border border-cyan-300/35 bg-cyan-300/18 px-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/28 disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={posting || composerPostType !== "SCENT_OF_DAY" || !selectedScents.length}
                  onClick={() => {
                    if (composerPostType !== "SCENT_OF_DAY") return;
                    void onSubmitScentPost();
                  }}
                >
                  {posting ? "Posting" : "Post"}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {mobileScentPickerView ? (
                <div>
                  <div className="mb-3 text-xs text-white/60">Pick up to 3 for your scent stack.</div>
                  {!collectionItems.length ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                      Add fragrances to your collection first.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {collectionItems.map((item) => {
                        const key = `${item.source.toUpperCase()}:${item.externalId}`;
                        const selected = selectedScentKeys.includes(key);
                        const reachedLimit = selectedScentKeys.length >= 3 && !selected;
                        const rank = selected ? selectedScentKeys.indexOf(key) + 1 : null;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={[
                              "group relative overflow-hidden rounded-xl border text-left transition",
                              selected
                                ? "border-cyan-300/45 bg-cyan-300/14"
                                : "border-white/12 bg-white/[0.03] hover:bg-white/[0.07]",
                              reachedLimit ? "cursor-not-allowed opacity-55" : "",
                            ].join(" ")}
                            onClick={() => {
                              if (reachedLimit) return;
                              toggleScent(item);
                            }}
                            disabled={reachedLimit}
                          >
                            <img
                              src={item.imageUrl?.trim() ? item.imageUrl : FALLBACK_FRAGRANCE_IMG}
                              alt={item.name}
                              className="h-36 w-full border-b border-white/10 object-cover bg-white/5"
                              loading="lazy"
                              onError={(e) => {
                                const img = e.currentTarget;
                                if (img.dataset.fallbackApplied === "1") return;
                                img.dataset.fallbackApplied = "1";
                                img.src = FALLBACK_FRAGRANCE_IMG;
                              }}
                            />
                            {rank ? (
                              <span className="absolute left-2 top-2 rounded-full border border-cyan-200/50 bg-cyan-300/30 px-2 py-0.5 text-[11px] font-semibold text-cyan-50">
                                #{rank}
                              </span>
                            ) : null}
                            <div className="p-3">
                              <div className="line-clamp-1 text-sm font-semibold text-white/95">{item.name}</div>
                              <div className="line-clamp-1 text-xs text-white/65">{item.brand || "—"}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-start gap-2">
                    <button
                      type="button"
                      className="text-xs text-white/60 transition hover:text-white"
                      onClick={() => setSelectedScentKeys([])}
                      disabled={!selectedScentKeys.length}
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              ) : composerForm}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={scentPickerOpen}
        onOpenChange={(next) => {
          setScentPickerOpen(next);
        }}
      >
        <DialogContent className="w-[calc(100vw-24px)] max-h-[85vh] max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#090a0f] p-0 text-white [&>button]:hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Select fragrances</div>
              <div className="text-xs text-white/60">Pick up to 3 for your scent stack.</div>
            </div>
            <div className="text-xs text-cyan-100/80">{selectedScents.length}/3 selected</div>
          </div>
          <div className="max-h-[62vh] overflow-y-auto p-4">
            {!collectionItems.length ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/70">
                Add fragrances to your collection first.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {collectionItems.map((item) => {
                  const key = `${item.source.toUpperCase()}:${item.externalId}`;
                  const selected = selectedScentKeys.includes(key);
                  const reachedLimit = selectedScentKeys.length >= 3 && !selected;
                  const rank = selected ? selectedScentKeys.indexOf(key) + 1 : null;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={[
                        "group relative overflow-hidden rounded-xl border text-left transition",
                        selected
                          ? "border-cyan-300/45 bg-cyan-300/14"
                          : "border-white/12 bg-white/[0.03] hover:bg-white/[0.07]",
                        reachedLimit ? "cursor-not-allowed opacity-55" : "",
                      ].join(" ")}
                      onClick={() => {
                        if (reachedLimit) return;
                        toggleScent(item);
                      }}
                      disabled={reachedLimit}
                    >
                      <img
                        src={item.imageUrl?.trim() ? item.imageUrl : FALLBACK_FRAGRANCE_IMG}
                        alt={item.name}
                        className="h-36 w-full border-b border-white/10 object-cover bg-white/5"
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.dataset.fallbackApplied === "1") return;
                          img.dataset.fallbackApplied = "1";
                          img.src = FALLBACK_FRAGRANCE_IMG;
                        }}
                      />
                      {rank ? (
                        <span className="absolute left-2 top-2 rounded-full border border-cyan-200/50 bg-cyan-300/30 px-2 py-0.5 text-[11px] font-semibold text-cyan-50">
                          #{rank}
                        </span>
                      ) : null}
                      <div className="p-3">
                        <div className="line-clamp-1 text-sm font-semibold text-white/95">{item.name}</div>
                        <div className="line-clamp-1 text-xs text-white/65">{item.brand || "—"}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
            <button
              type="button"
              className="text-xs text-white/60 transition hover:text-white"
              onClick={() => setSelectedScentKeys([])}
              disabled={!selectedScentKeys.length}
            >
              Clear all
            </button>
            <Button
              className="h-9 rounded-lg px-4"
              onClick={closeScentPicker}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <DialogContent className="md:hidden left-0 top-auto bottom-0 w-screen max-w-none translate-x-0 rounded-t-2xl rounded-b-none border-x-0 border-b-0 border-t border-white/15 bg-[#090a0f] p-0 text-white shadow-[0_-20px_50px_rgba(0,0,0,0.55)] transition-all duration-300 ease-out data-[state=open]:translate-y-0 data-[state=closed]:translate-y-full [&>button]:hidden">
          <div className="border-b border-white/10 px-4 py-2.5">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
            <div className="text-sm font-semibold">Filter feed</div>
            <div className="text-xs text-white/60">Choose what appears in your feed.</div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-white/90 transition hover:bg-white/10"
                onClick={() => applyFilter(option.value)}
              >
                <span>{option.label}</span>
                {filter === option.value ? <Check className="h-4 w-4 text-cyan-200" /> : null}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={Boolean(pendingDeleteReviewId)}
        title="Delete review?"
        description="This removes the review from your profile and feed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        loading={Boolean(pendingDeleteReviewId && deletingReviewId === pendingDeleteReviewId)}
        onCancel={() => {
          if (deletingReviewId) return;
          setPendingDeleteReviewId(null);
        }}
        onConfirm={() => {
          if (!pendingDeleteReviewId) return;
          void onDeleteReview(pendingDeleteReviewId);
        }}
      />
    </div>
  );
}
