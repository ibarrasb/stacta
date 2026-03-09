import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMe } from "../../../lib/api/me";
import { addToCollection, addTopFragrance, removeFromCollection, removeFromWishlist, removeTopFragrance } from "../../../lib/api/collection";
import { listMyReviewFeed } from "../../../lib/api/feed";
import { deleteReview, likeReview, reportReview, repostReview, unlikeReview, unrepostReview } from "../../../lib/api/reviews";
import type { CollectionItem, FeedItem, MeResponse } from "../../../lib/api/types";
import fragranceFallback from "../../../../assets/fragrance-fallback.png";
import {
  collectionSource,
  compactCount,
  fragranceRatingLabel,
  initials,
  performanceValueLabel,
  priceTagFromScore,
  safeMap,
  timeAgo,
} from "../utils";

type ProfileTab = "overview" | "reviews" | "wishlist" | "community" | "posts";
type CollectionSortKey = "added" | "name" | "rating" | "brand";
type ReviewSortKey = "recent" | "rating" | "likes" | "comments" | "reposts";
type SortDirection = "asc" | "desc";

function StarReputation({ value }: { value: number }) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  return (
    <View style={styles.starRow}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= Math.round(safe);
        return (
          <Ionicons
            key={`star-${i}`}
            name={filled ? "star" : "star-outline"}
            size={12}
            color={filled ? "#FCD34D" : "#FFFFFF40"}
          />
        );
      })}
    </View>
  );
}

function HalfStars({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <View style={styles.halfStarsRow}>
      {Array.from({ length: 5 }).map((_, i) => {
        const diff = clamped - i;
        const icon: keyof typeof Ionicons.glyphMap =
          diff >= 1 ? "star" : diff >= 0.5 ? "star-half" : "star-outline";
        return <Ionicons key={`half-star-${i}`} name={icon} size={12} color="#FCD34D" />;
      })}
    </View>
  );
}

function FragranceCard({ item, topLabel }: { item: CollectionItem; topLabel?: string }) {
  const rank = topLabel?.replace("Top ", "") ?? "";
  const rankColor = rank === "1" ? "#FDE68A" : rank === "2" ? "#BAE6FD" : "#FBCFE8";
  const rankIcon: keyof typeof Ionicons.glyphMap =
    rank === "1" ? "trophy-outline" : rank === "2" ? "medal-outline" : "ribbon-outline";
  return (
    <View style={styles.fragranceCard}>
      <View style={styles.fragranceGlow} />
      {topLabel ? (
        <View style={styles.rankBadge}>
          <Ionicons name={rankIcon} size={10} color={rankColor} />
          <Text style={[styles.rankBadgeHash, { color: rankColor }]}>#{rank}</Text>
          <Text style={styles.rankBadgeText}>Top Pick</Text>
        </View>
      ) : null}
      <Image source={item.imageUrl ? { uri: item.imageUrl } : fragranceFallback} style={styles.fragranceImage} resizeMode="cover" />
      <View style={styles.fragranceMeta}>
        <Text style={styles.fragranceName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.fragranceBrand} numberOfLines={1}>{item.brand || "-"}</Text>
        <View style={styles.fragranceRatingRow}>
          {Number(item.userRating ?? 0) >= 1 ? (
            <>
              <HalfStars value={Number(item.userRating)} />
              <Text style={styles.fragranceRatingText}>{Number(item.userRating).toFixed(1)}</Text>
            </>
          ) : (
            <Text style={styles.fragranceRatingMuted}>Not rated</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingIcon}>
        <Ionicons name={icon} size={14} color="#A5F3FC" />
      </View>
      <View style={styles.sectionHeadingText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

function StatBlock({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: "cyan" | "gold" | "blue" | "rose";
}) {
  const cardStyle =
    accent === "cyan"
      ? styles.statCardCyan
      : accent === "gold"
        ? styles.statCardGold
        : accent === "blue"
          ? styles.statCardBlue
          : styles.statCardRose;
  const iconStyle =
    accent === "cyan"
      ? styles.statIconCyan
      : accent === "gold"
        ? styles.statIconGold
        : accent === "blue"
          ? styles.statIconBlue
          : styles.statIconRose;
  return (
    <View style={[styles.statCard, cardStyle]}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconWrap, iconStyle]}>
          <Ionicons
            name={icon}
            size={13}
            color={
              accent === "cyan"
                ? "#67E8F9"
                : accent === "gold"
                  ? "#FDE68A"
                  : accent === "blue"
                    ? "#93C5FD"
                    : "#FDA4AF"
            }
          />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

type MeScreenProps = {
  userLabel: string;
  onOpenSettings: () => void;
  onOpenEditProfile: () => void;
};

export function MeScreen({ userLabel, onOpenSettings, onOpenEditProfile }: MeScreenProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [collectionSortKey, setCollectionSortKey] = useState<CollectionSortKey>("added");
  const [collectionSortDirection, setCollectionSortDirection] = useState<SortDirection>("desc");
  const [reviewSortKey, setReviewSortKey] = useState<ReviewSortKey>("recent");
  const [reviewSortDirection, setReviewSortDirection] = useState<SortDirection>("desc");
  const [wishlistSortKey, setWishlistSortKey] = useState<CollectionSortKey>("added");
  const [wishlistSortDirection, setWishlistSortDirection] = useState<SortDirection>("desc");
  const [communitySortKey, setCommunitySortKey] = useState<CollectionSortKey>("added");
  const [communitySortDirection, setCommunitySortDirection] = useState<SortDirection>("desc");
  const [collectionActionLoadingKey, setCollectionActionLoadingKey] = useState<string | null>(null);
  const [collectionActionItem, setCollectionActionItem] = useState<CollectionItem | null>(null);
  const [wishlistActionItem, setWishlistActionItem] = useState<CollectionItem | null>(null);
  const [wishlistActionBusy, setWishlistActionBusy] = useState(false);
  const [reviewItems, setReviewItems] = useState<FeedItem[]>([]);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Record<string, boolean>>({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewActionItem, setReviewActionItem] = useState<FeedItem | null>(null);
  const [reviewActionBusy, setReviewActionBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const entrance = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setMe(null);
      try {
        const data = await getMe();
        if (cancelled) return;
        setMe(data);
      } catch (err) {
        if (cancelled) return;
        const message = (err as { message?: string })?.message;
        setError(message || "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userLabel]);

  useFocusEffect(
    useMemo(
      () => () => {
        let cancelled = false;
        (async () => {
          try {
            const data = await getMe();
            if (!cancelled) setMe(data);
          } catch {
            // no-op: keep previous profile snapshot on transient refresh errors
          }
        })();
        return () => {
          cancelled = true;
        };
      },
      []
    )
  );

  const usernameLabel = useMemo(() => {
    const username = me?.username?.trim();
    if (username) return `@${username}`;
    return userLabel.includes("@") ? userLabel : `@${userLabel.split("@")[0] || "stacta"}`;
  }, [me?.username, userLabel]);

  const displayName = me?.displayName?.trim() || userLabel;
  const bio = me?.bio?.trim() || "Add a bio so people know what you are into.";
  const topItems = me?.topFragrances?.slice(0, 3) ?? [];
  const tabs: Array<{ id: ProfileTab; icon: keyof typeof Ionicons.glyphMap }> = [
    { id: "overview", icon: "home-outline" },
    { id: "reviews", icon: "chatbubble-ellipses-outline" },
    { id: "wishlist", icon: "heart-outline" },
    { id: "community", icon: "planet-outline" },
    { id: "posts", icon: "document-text-outline" },
  ];
  const collectionSortLabels: Record<CollectionSortKey, string> = {
    added: "Added",
    name: "Name",
    rating: "Rating",
    brand: "Brand",
  };
  const reviewSortLabels: Record<ReviewSortKey, string> = {
    recent: "Recent",
    rating: "Rating",
    likes: "Likes",
    comments: "Comments",
    reposts: "Reposts",
  };
  const sortedCollectionItems = useMemo(() => {
    const items = [...(me?.collectionItems ?? [])];
    items.sort((a, b) => {
      let base = 0;
      if (collectionSortKey === "name") {
        base = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      } else if (collectionSortKey === "brand") {
        base = (a.brand ?? "").localeCompare(b.brand ?? "", undefined, { sensitivity: "base" });
      } else if (collectionSortKey === "rating") {
        const ra = Number(a.userRating ?? 0);
        const rb = Number(b.userRating ?? 0);
        base = ra - rb;
      } else {
        const ta = new Date(a.addedAt).getTime();
        const tb = new Date(b.addedAt).getTime();
        base = ta - tb;
      }
      return collectionSortDirection === "asc" ? base : -base;
    });
    return items;
  }, [me?.collectionItems, collectionSortDirection, collectionSortKey]);
  const sortedWishlistItems = useMemo(() => {
    const items = [...(me?.wishlistItems ?? [])];
    items.sort((a, b) => {
      let base = 0;
      if (wishlistSortKey === "name") {
        base = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      } else if (wishlistSortKey === "brand") {
        base = (a.brand ?? "").localeCompare(b.brand ?? "", undefined, { sensitivity: "base" });
      } else if (wishlistSortKey === "rating") {
        base = Number(a.userRating ?? 0) - Number(b.userRating ?? 0);
      } else {
        base = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      }
      return wishlistSortDirection === "asc" ? base : -base;
    });
    return items;
  }, [me?.wishlistItems, wishlistSortDirection, wishlistSortKey]);
  const sortedCommunityItems = useMemo(() => {
    const items = [...(me?.communityFragrances ?? [])];
    items.sort((a, b) => {
      let base = 0;
      if (communitySortKey === "name") {
        base = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      } else if (communitySortKey === "brand") {
        base = (a.brand ?? "").localeCompare(b.brand ?? "", undefined, { sensitivity: "base" });
      } else if (communitySortKey === "rating") {
        base = Number(a.userRating ?? 0) - Number(b.userRating ?? 0);
      } else {
        base = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      }
      return communitySortDirection === "asc" ? base : -base;
    });
    return items;
  }, [me?.communityFragrances, communitySortDirection, communitySortKey]);
  const sortedReviewItems = useMemo(() => {
    const items = [...reviewItems];
    items.sort((a, b) => {
      let base = 0;
      if (reviewSortKey === "rating") base = Number(a.reviewRating ?? 0) - Number(b.reviewRating ?? 0);
      else if (reviewSortKey === "likes") base = Number(a.likesCount ?? 0) - Number(b.likesCount ?? 0);
      else if (reviewSortKey === "comments") base = Number(a.commentsCount ?? 0) - Number(b.commentsCount ?? 0);
      else if (reviewSortKey === "reposts") base = Number(a.repostsCount ?? 0) - Number(b.repostsCount ?? 0);
      else base = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return reviewSortDirection === "asc" ? base : -base;
    });
    return items;
  }, [reviewItems, reviewSortDirection, reviewSortKey]);
  const reviewBrandByKey = useMemo(() => {
    const map = new Map<string, string>();
    const lists = [me?.collectionItems ?? [], me?.wishlistItems ?? [], me?.communityFragrances ?? [], me?.topFragrances ?? []];
    for (const list of lists) {
      for (const item of list) {
        const key = `${collectionSource(item.source)}:${item.externalId}`;
        if (!map.has(key) && item.brand?.trim()) map.set(key, item.brand.trim());
      }
    }
    return map;
  }, [me?.collectionItems, me?.wishlistItems, me?.communityFragrances, me?.topFragrances]);

  function cycleCollectionSortKey() {
    setCollectionSortKey((prev) =>
      prev === "added" ? "name" : prev === "name" ? "rating" : prev === "rating" ? "brand" : "added"
    );
  }
  function cycleReviewSortKey() {
    setReviewSortKey((prev) =>
      prev === "recent" ? "rating" : prev === "rating" ? "likes" : prev === "likes" ? "comments" : prev === "comments" ? "reposts" : "recent"
    );
  }
  function cycleWishlistSortKey() {
    setWishlistSortKey((prev) =>
      prev === "added" ? "name" : prev === "name" ? "rating" : prev === "rating" ? "brand" : "added"
    );
  }
  function cycleCommunitySortKey() {
    setCommunitySortKey((prev) =>
      prev === "added" ? "name" : prev === "name" ? "rating" : prev === "rating" ? "brand" : "added"
    );
  }

  function collectionKey(item: CollectionItem) {
    return `${item.source}:${item.externalId}`;
  }

  function inTopThree(item: CollectionItem) {
    const key = collectionKey(item);
    return (me?.topFragrances ?? []).some((top) => collectionKey(top) === key);
  }

  async function refreshMeSnapshot() {
    const data = await getMe();
    setMe(data);
  }

  async function setTopFragrancePosition(item: CollectionItem, position: 1 | 2 | 3) {
    if (!me) return;
    const normalizedSource = collectionSource(item.source);
    const keyFor = (x: { source: string; externalId: string }) => `${collectionSource(x.source)}:${x.externalId}`;
    const selectedKey = `${normalizedSource}:${item.externalId}`;
    const targetItem = me.collectionItems.find((x) => keyFor(x) === selectedKey);
    if (!targetItem) return;

    const topWithoutTarget = me.topFragrances.filter((x) => keyFor(x) !== selectedKey);
    const insertAt = Math.max(0, Math.min(position - 1, topWithoutTarget.length));
    const desiredTop = [...topWithoutTarget];
    desiredTop.splice(insertAt, 0, targetItem);
    const nextTop = desiredTop.slice(0, 3);
    const currentTop = me.topFragrances;
    const isSame =
      nextTop.length === currentTop.length &&
      nextTop.every((x, idx) => keyFor(x) === keyFor(currentTop[idx]));
    if (isSame) return;

    for (const topItem of currentTop) {
      await removeTopFragrance({ source: collectionSource(topItem.source), externalId: topItem.externalId });
    }
    for (const topItem of nextTop) {
      await addTopFragrance({ source: collectionSource(topItem.source), externalId: topItem.externalId });
    }
  }

  function openCollectionItemActions(item: CollectionItem) {
    setCollectionActionItem(item);
  }

  function closeCollectionItemActions() {
    if (collectionActionLoadingKey) return;
    setCollectionActionItem(null);
  }

  async function runCollectionItemAction(
    item: CollectionItem,
    action: "set1" | "set2" | "set3" | "removeTop" | "removeCollection"
  ) {
    const key = collectionKey(item);
    const source = collectionSource(item.source);
    setCollectionActionLoadingKey(key);
    try {
      if (action === "set1") await setTopFragrancePosition(item, 1);
      if (action === "set2") await setTopFragrancePosition(item, 2);
      if (action === "set3") await setTopFragrancePosition(item, 3);
      if (action === "removeTop") await removeTopFragrance({ source, externalId: item.externalId });
      if (action === "removeCollection") await removeFromCollection({ source, externalId: item.externalId });
      await refreshMeSnapshot();
      setCollectionActionItem(null);
    } catch (err) {
      Alert.alert("Action failed", (err as { message?: string })?.message || "Could not complete action.");
    } finally {
      setCollectionActionLoadingKey(null);
    }
  }

  async function runWishlistAction(action: "purchased" | "remove") {
    if (!wishlistActionItem) return;
    const source = collectionSource(wishlistActionItem.source);
    setWishlistActionBusy(true);
    try {
      if (action === "purchased") {
        await addToCollection({
          source,
          externalId: wishlistActionItem.externalId,
          name: wishlistActionItem.name,
          brand: wishlistActionItem.brand,
          imageUrl: wishlistActionItem.imageUrl,
          collectionTag: null,
        });
      }
      await removeFromWishlist({ source, externalId: wishlistActionItem.externalId });
      await refreshMeSnapshot();
      setWishlistActionItem(null);
    } catch (err) {
      Alert.alert("Wishlist action failed", (err as { message?: string })?.message || "Could not update wishlist item.");
    } finally {
      setWishlistActionBusy(false);
    }
  }

  async function onToggleReviewLike(item: FeedItem) {
    const id = item.sourceReviewId || item.id;
    const wasLiked = Boolean(item.viewerHasLiked);
    setReviewItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? { ...row, viewerHasLiked: !wasLiked, likesCount: Math.max(0, row.likesCount + (wasLiked ? -1 : 1)) }
          : row
      )
    );
    try {
      const res = wasLiked ? await unlikeReview(id) : await likeReview(id);
      setReviewItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, viewerHasLiked: res.viewerHasLiked, likesCount: res.likesCount } : row))
      );
    } catch {
      setReviewItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, viewerHasLiked: wasLiked, likesCount: Math.max(0, row.likesCount + (wasLiked ? 1 : -1)) } : row
        )
      );
    }
  }

  async function onToggleReviewRepost(item: FeedItem) {
    const id = item.sourceReviewId || item.id;
    const wasReposted = Boolean(item.viewerHasReposted);
    setReviewItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? { ...row, viewerHasReposted: !wasReposted, repostsCount: Math.max(0, row.repostsCount + (wasReposted ? -1 : 1)) }
          : row
      )
    );
    try {
      const res = wasReposted ? await unrepostReview(id) : await repostReview(id);
      setReviewItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, viewerHasReposted: res.viewerHasReposted, repostsCount: res.repostsCount } : row))
      );
    } catch {
      setReviewItems((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, viewerHasReposted: wasReposted, repostsCount: Math.max(0, row.repostsCount + (wasReposted ? 1 : -1)) }
            : row
        )
      );
    }
  }

  async function onDeleteReview(item: FeedItem) {
    const id = item.sourceReviewId || item.id;
    setReviewActionBusy(true);
    try {
      await deleteReview(id);
      setReviewItems((prev) => prev.filter((row) => row.id !== item.id));
      setReviewActionItem(null);
    } catch (err) {
      Alert.alert("Delete failed", (err as { message?: string })?.message || "Could not delete review.");
    } finally {
      setReviewActionBusy(false);
    }
  }

  async function onReportReview(item: FeedItem) {
    const id = item.sourceReviewId || item.id;
    setReviewActionBusy(true);
    try {
      await reportReview(id, { reason: "OTHER" });
      setReviewActionItem(null);
      Alert.alert("Reported", "Review reported.");
    } catch (err) {
      Alert.alert("Report failed", (err as { message?: string })?.message || "Could not report review.");
    } finally {
      setReviewActionBusy(false);
    }
  }

  useEffect(() => {
    if (loading || error) return;
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, loading, error, me]);

  useEffect(() => {
    if (activeTab !== "reviews" || reviewsLoaded) return;
    let cancelled = false;
    async function loadReviews() {
      setReviewsLoading(true);
      try {
        const page = await listMyReviewFeed({ limit: 20 });
        if (!cancelled) {
          setReviewItems(page.items ?? []);
          setReviewsLoaded(true);
        }
      } catch {
        if (!cancelled) setReviewItems([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    }
    void loadReviews();
    return () => {
      cancelled = true;
    };
  }, [activeTab, reviewsLoaded]);

  const entranceStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };
  const actionItemKey = collectionActionItem ? collectionKey(collectionActionItem) : null;
  const actionBusy = Boolean(actionItemKey && collectionActionLoadingKey === actionItemKey);
  const actionItemIsTop = collectionActionItem ? inTopThree(collectionActionItem) : false;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <View style={styles.centerState}>
          <ActivityIndicator color="#A5F3FC" />
          <Text style={styles.subtleText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !me) {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <View style={styles.screenPad}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error || "Failed to load profile."}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <Animated.View style={[styles.flex, entranceStyle]}>
        <ScrollView
          contentContainerStyle={styles.pageScroll}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[3]}
        >
          <View style={styles.headerCard}>
            <Pressable style={styles.settingsTopRight} onPress={onOpenSettings}>
              <Ionicons name="settings-outline" size={18} color="#FFFFFFD9" />
            </Pressable>

            <View style={styles.headerRow}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatarHalo}>
                  {me.avatarUrl?.trim() ? (
                    <Image source={{ uri: me.avatarUrl }} style={styles.avatarFallback} resizeMode="cover" />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{initials(displayName)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.avatarVisibility}>{me.isPrivate ? "Private" : "Public"}</Text>
              </View>

              <View style={styles.headerMeta}>
                <View style={styles.nameRow}>
                  <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
                  <View style={styles.inlineUsernamePill}>
                    <Text style={styles.inlineUsername} numberOfLines={1}>{usernameLabel}</Text>
                  </View>
                  {me.isVerified ? <Ionicons name="checkmark-circle" size={16} color="#A5F3FC" /> : null}
                </View>
                <View style={styles.followRow}>
                  <Text style={styles.followText}><Text style={styles.followCount}>{compactCount(me.followersCount)}</Text> followers</Text>
                  <Text style={styles.followText}><Text style={styles.followCount}>{compactCount(me.followingCount)}</Text> following</Text>
                </View>
                <Text style={styles.bioText}>{bio}</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <View style={styles.repInlineCard}>
                <Ionicons name="sparkles" size={13} color="#FDE68A" />
                <Text style={styles.repInlineLabel}>Stacta rep</Text>
                <StarReputation value={Number(me.creatorRatingAverage ?? 0)} />
                <Text style={styles.repInlineValue}>
                  {Number(me.creatorRatingCount ?? 0) > 0
                    ? `${Number(me.creatorRatingAverage ?? 0).toFixed(2)} • ${me.creatorRatingCount ?? 0}`
                    : "No ratings"}
                </Text>
              </View>
              <Pressable style={styles.primaryBtn} onPress={onOpenEditProfile}>
                <Text style={styles.primaryBtnText}>Edit profile</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          <View style={[styles.sectionCard, styles.metricsSectionCard]}>
            <View style={styles.statsGrid}>
              <StatBlock
                label="Collection"
                value={me.collectionCount ?? 0}
                hint="Fragrances in your collection"
                icon="library-outline"
                accent="cyan"
              />
              <StatBlock
                label="Reviews"
                value={me.reviewCount ?? 0}
                hint="Fragrance reviews posted"
                icon="chatbubble-ellipses-outline"
                accent="gold"
              />
              <StatBlock
                label="Community"
                value={me.communityFragranceCount ?? 0}
                hint="Fragrances you contributed"
                icon="planet-outline"
                accent="blue"
              />
              <StatBlock
                label="Wishlist"
                value={me.wishlistCount ?? 0}
                hint="Fragrances on your wishlist"
                icon="heart-outline"
                accent="rose"
              />
            </View>
          </View>

          <View style={styles.iconTabsStickyWrap}>
            <View style={styles.iconTabsRow}>
              {tabs.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <Pressable
                    key={tab.id}
                    style={styles.iconTabBtn}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={17}
                      color={active ? "#F8FAFC" : "#FFFFFF8C"}
                    />
                    <View style={[styles.iconTabUnderline, active && styles.iconTabUnderlineActive]} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {activeTab === "overview" ? (
            <View style={[styles.sectionCard, styles.sectionWrap]}>
              <SectionHeading icon="sparkles-outline" title="Top 3 Fragrances" subtitle="These are your spotlight picks." />
              {topItems.length ? (
                <View style={styles.topThreeRow}>
                  {topItems.map((item, idx) => {
                    const slotStyle =
                      topItems.length === 1
                        ? styles.topThreeSlotOne
                        : topItems.length === 2
                          ? styles.topThreeSlotTwo
                          : styles.topThreeSlotThree;
                    return (
                      <View key={`${item.source}:${item.externalId}`} style={[styles.topThreeSlotBase, slotStyle]}>
                        <FragranceCard item={item} topLabel={`Top ${idx + 1}`} />
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCallout}><Text style={styles.emptyCalloutText}>Pick up to 3 from your collection using Set Top 3.</Text></View>
              )}

              <View style={styles.subSeparator} />

              <View style={styles.collectionHeaderRow}>
                <SectionHeading icon="library-outline" title="Collection" subtitle="Fragrances you have added." />
                <View style={styles.collectionFilters}>
                  <Pressable style={styles.filterBtn} onPress={cycleCollectionSortKey}>
                    <Ionicons name="options-outline" size={12} color="#A5F3FC" />
                    <Text style={styles.filterBtnText}>{collectionSortLabels[collectionSortKey]}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.filterBtn}
                    onPress={() => setCollectionSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  >
                    <Ionicons
                      name={collectionSortDirection === "asc" ? "arrow-up-outline" : "arrow-down-outline"}
                      size={12}
                      color="#A5F3FC"
                    />
                    <Text style={styles.filterBtnText}>{collectionSortDirection.toUpperCase()}</Text>
                  </Pressable>
                </View>
              </View>
              {sortedCollectionItems.length ? (
                <View style={styles.collectionShelfGrid}>
                  {sortedCollectionItems.slice(0, 8).map((item) => (
                    <View key={`${item.source}:${item.externalId}`} style={styles.collectionShelfCard}>
                      <Image source={item.imageUrl ? { uri: item.imageUrl } : fragranceFallback} style={styles.collectionShelfImage} />
                      <View style={styles.collectionShelfMeta}>
                        <View style={styles.collectionNameRow}>
                          <Text style={styles.collectionShelfName} numberOfLines={2}>{item.name}</Text>
                          <Pressable
                            style={styles.collectionMoreBtn}
                            onPress={() => openCollectionItemActions(item)}
                            disabled={collectionActionLoadingKey === collectionKey(item)}
                          >
                            <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFFF0" />
                          </Pressable>
                        </View>
                        <Text style={styles.collectionShelfBrand} numberOfLines={1}>{item.brand || "-"}</Text>
                        <View style={styles.collectionRatingRow}>
                          {Number(item.userRating ?? 0) >= 1 ? (
                            <>
                              <HalfStars value={Number(item.userRating)} />
                              <Text style={styles.collectionRatingText}>{fragranceRatingLabel(item.userRating)}</Text>
                            </>
                          ) : (
                            <Text style={styles.collectionRatingTextMuted}>Not rated</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>Your collection is empty.</Text></View>
              )}
            </View>
          ) : null}

          {activeTab === "reviews" ? (
            <View style={[styles.sectionCard, styles.sectionWrap]}>
              <View style={styles.collectionHeaderRow}>
                <SectionHeading
                  icon="chatbubble-ellipses-outline"
                  title="Reviews"
                  subtitle={`You have posted ${me.reviewCount ?? 0} review(s).`}
                />
                <View style={styles.collectionFilters}>
                  <Pressable style={styles.filterBtn} onPress={cycleReviewSortKey}>
                    <Ionicons name="options-outline" size={12} color="#A5F3FC" />
                    <Text style={styles.filterBtnText}>{reviewSortLabels[reviewSortKey]}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.filterBtn}
                    onPress={() => setReviewSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  >
                    <Ionicons
                      name={reviewSortDirection === "asc" ? "arrow-up-outline" : "arrow-down-outline"}
                      size={12}
                      color="#A5F3FC"
                    />
                    <Text style={styles.filterBtnText}>{reviewSortDirection.toUpperCase()}</Text>
                  </Pressable>
                </View>
              </View>
              {reviewsLoading ? (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>Loading reviews…</Text></View>
              ) : sortedReviewItems.length ? (
                <View style={styles.collectionList}>
                  {sortedReviewItems.map((item) => {
                    const perf = safeMap(item.reviewPerformance);
                    const priceRow = perf.find((row) => row.label.toLowerCase() === "price perception") ?? null;
                    const perfRows = perf.filter((row) => row.label.toLowerCase() !== "price perception");
                    const seasonRows = safeMap(item.reviewSeason);
                    const occasionRows = safeMap(item.reviewOccasion);
                    return (
                      <View key={item.id} style={styles.reviewCard}>
                      <Pressable style={styles.reviewMoreBtn} onPress={() => setReviewActionItem(item)}>
                        <Ionicons name="ellipsis-horizontal" size={15} color="#FFFFFFB8" />
                      </Pressable>
                      <View style={styles.reviewMediaCol}>
                        <Image
                          source={item.fragranceImageUrl ? { uri: item.fragranceImageUrl } : fragranceFallback}
                          style={styles.reviewImage}
                        />
                        <Text style={styles.reviewTimeText}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      <View style={styles.reviewMeta}>
                        <Text style={styles.reviewTitle} numberOfLines={1}>{item.fragranceName || "Fragrance"}</Text>
                        <Text style={styles.reviewBrandText} numberOfLines={1}>
                          {(() => {
                            const key = `${collectionSource(item.fragranceSource || "FRAGELLA")}:${item.fragranceExternalId || ""}`;
                            return reviewBrandByKey.get(key) || "—";
                          })()}
                        </Text>
                        {Number(item.reviewRating ?? 0) > 0 ? (
                          <View style={styles.reviewRatingRow}>
                            <HalfStars value={Number(item.reviewRating)} />
                            <Text style={styles.collectionRatingText}>{Number(item.reviewRating).toFixed(1)} / 5</Text>
                          </View>
                        ) : null}
                        <Text style={styles.reviewExcerpt} numberOfLines={3}>
                          {item.reviewExcerpt?.trim() || "No excerpt provided."}
                        </Text>
                        <View style={styles.reviewFooterRow}>
                          <Pressable
                            onPress={() =>
                              setExpandedReviewIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                            }
                          >
                            <Text style={styles.reviewDetailsToggle}>
                              {expandedReviewIds[item.id] ? "Hide Details" : "View Details"}
                            </Text>
                          </Pressable>
                          <View style={styles.reviewActionsRow}>
                            <Pressable style={styles.reviewActionBtn} onPress={() => void onToggleReviewLike(item)}>
                              <Ionicons
                                name={item.viewerHasLiked ? "heart" : "heart-outline"}
                                size={14}
                                color={item.viewerHasLiked ? "#3EB489" : "#FFFFFFA8"}
                              />
                              <Text style={styles.reviewActionCount}>{item.likesCount ?? 0}</Text>
                            </Pressable>
                            <Pressable
                              style={styles.reviewActionBtn}
                              onPress={() => Alert.alert("Comments", "Comments thread is coming to mobile profile soon.")}
                            >
                              <Ionicons name="chatbubble-outline" size={14} color="#FFFFFFA8" />
                              <Text style={styles.reviewActionCount}>{item.commentsCount ?? 0}</Text>
                            </Pressable>
                            <Pressable style={styles.reviewActionBtn} onPress={() => void onToggleReviewRepost(item)}>
                              <Ionicons
                                name="repeat-outline"
                                size={14}
                                color={item.viewerHasReposted ? "#3EB489" : "#FFFFFFA8"}
                              />
                              <Text style={styles.reviewActionCount}>{item.repostsCount ?? 0}</Text>
                            </Pressable>
                          </View>
                        </View>
                        {expandedReviewIds[item.id] ? (
                          <View style={styles.reviewDetailsPanel}>
                            {perfRows.length || priceRow ? (
                              <View style={styles.reviewDetailSection}>
                                <Text style={styles.reviewDetailHeading}>Performance</Text>
                                {perfRows.map((row) => (
                                  <View key={`${item.id}-perf-${row.label}`} style={styles.reviewDetailMetric}>
                                    <View style={styles.reviewDetailMetricTop}>
                                      <Text style={styles.reviewDetailLabel}>{row.label}</Text>
                                      <Text style={styles.reviewDetailValue}>{performanceValueLabel(row.label, row.value)}</Text>
                                    </View>
                                    <View style={styles.reviewDetailBarTrack}>
                                      <View style={[styles.reviewDetailBarFill, { width: `${Math.round((row.value / 5) * 100)}%` }]} />
                                    </View>
                                  </View>
                                ))}
                                {priceRow ? (
                                  <View style={styles.reviewPriceRow}>
                                    <Text style={styles.reviewDetailLabel}>Price</Text>
                                    <Text
                                      style={[
                                        styles.reviewPricePill,
                                        priceRow.value <= 1
                                          ? styles.reviewPricePillRed
                                          : priceRow.value === 2
                                            ? styles.reviewPricePillOrange
                                            : priceRow.value === 3
                                              ? styles.reviewPricePillNeutral
                                              : priceRow.value === 4
                                                ? styles.reviewPricePillEmerald
                                                : styles.reviewPricePillGreen,
                                      ]}
                                    >
                                      {priceTagFromScore(priceRow.value)}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            ) : null}

                            {seasonRows.length ? (
                              <View style={styles.reviewDetailSection}>
                                <Text style={styles.reviewDetailHeading}>Season</Text>
                                {seasonRows.map((row) => (
                                  <View key={`${item.id}-season-${row.label}`} style={styles.reviewDetailMetric}>
                                    <View style={styles.reviewDetailMetricTop}>
                                      <Text style={styles.reviewDetailLabel}>{row.label}</Text>
                                      <HalfStars value={row.value} />
                                    </View>
                                    <View style={styles.reviewDetailBarTrack}>
                                      <View style={[styles.reviewDetailBarFill, { width: `${Math.round((row.value / 5) * 100)}%` }]} />
                                    </View>
                                  </View>
                                ))}
                              </View>
                            ) : null}

                            {occasionRows.length ? (
                              <View style={styles.reviewDetailSection}>
                                <Text style={styles.reviewDetailHeading}>Occasion</Text>
                                {occasionRows.map((row) => (
                                  <View key={`${item.id}-occ-${row.label}`} style={styles.reviewDetailMetric}>
                                    <View style={styles.reviewDetailMetricTop}>
                                      <Text style={styles.reviewDetailLabel}>{row.label}</Text>
                                      <HalfStars value={row.value} />
                                    </View>
                                    <View style={styles.reviewDetailBarTrack}>
                                      <View style={[styles.reviewDetailBarFill, { width: `${Math.round((row.value / 5) * 100)}%` }]} />
                                    </View>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>No reviews yet. Post one from a fragrance detail page.</Text></View>
              )}
            </View>
          ) : null}

          {activeTab === "wishlist" ? (
            <View style={[styles.sectionCard, styles.sectionWrap]}>
              <View style={styles.collectionHeaderRow}>
                <SectionHeading icon="heart-outline" title="Wishlist" subtitle="Fragrances you want to buy or try." />
                <View style={styles.collectionFilters}>
                  <Pressable style={styles.filterBtn} onPress={cycleWishlistSortKey}>
                    <Ionicons name="options-outline" size={12} color="#A5F3FC" />
                    <Text style={styles.filterBtnText}>{collectionSortLabels[wishlistSortKey]}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.filterBtn}
                    onPress={() => setWishlistSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  >
                    <Ionicons
                      name={wishlistSortDirection === "asc" ? "arrow-up-outline" : "arrow-down-outline"}
                      size={12}
                      color="#A5F3FC"
                    />
                    <Text style={styles.filterBtnText}>{wishlistSortDirection.toUpperCase()}</Text>
                  </Pressable>
                </View>
              </View>
              {sortedWishlistItems.length ? (
                <View style={styles.collectionShelfGrid}>
                  {sortedWishlistItems.slice(0, 8).map((item) => (
                    <View key={`${item.source}:${item.externalId}`} style={styles.collectionShelfCard}>
                      <Image source={item.imageUrl ? { uri: item.imageUrl } : fragranceFallback} style={styles.collectionShelfImage} />
                      <View style={styles.collectionShelfMeta}>
                        <View style={styles.collectionNameRow}>
                          <Text style={styles.collectionShelfName} numberOfLines={2}>{item.name}</Text>
                          <Pressable
                            style={styles.collectionMoreBtn}
                            onPress={() => setWishlistActionItem(item)}
                          >
                            <Ionicons name="ellipsis-horizontal" size={16} color="#FFFFFFF0" />
                          </Pressable>
                        </View>
                        <Text style={styles.collectionShelfBrand} numberOfLines={1}>{item.brand || "-"}</Text>
                        <View style={styles.collectionRatingRow}>
                          {Number(item.userRating ?? 0) >= 1 ? (
                            <>
                              <HalfStars value={Number(item.userRating)} />
                              <Text style={styles.collectionRatingText}>{fragranceRatingLabel(item.userRating)}</Text>
                            </>
                          ) : (
                            <Text style={styles.collectionRatingTextMuted}>Not rated</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>Your wishlist is empty.</Text></View>
              )}
            </View>
          ) : null}

          {activeTab === "community" ? (
            <View style={[styles.sectionCard, styles.sectionWrap]}>
              <View style={styles.collectionHeaderRow}>
                <SectionHeading
                  icon="planet-outline"
                  title="Community Fragrances"
                  subtitle="Fragrances you contributed to the community catalog."
                />
                <View style={styles.collectionFilters}>
                  <Pressable style={styles.filterBtn} onPress={cycleCommunitySortKey}>
                    <Ionicons name="options-outline" size={12} color="#A5F3FC" />
                    <Text style={styles.filterBtnText}>{collectionSortLabels[communitySortKey]}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.filterBtn}
                    onPress={() => setCommunitySortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  >
                    <Ionicons
                      name={communitySortDirection === "asc" ? "arrow-up-outline" : "arrow-down-outline"}
                      size={12}
                      color="#A5F3FC"
                    />
                    <Text style={styles.filterBtnText}>{communitySortDirection.toUpperCase()}</Text>
                  </Pressable>
                </View>
              </View>
              {sortedCommunityItems.length ? (
                <View style={styles.collectionList}>
                  {sortedCommunityItems.slice(0, 8).map((item) => (
                    <View key={`${item.source}:${item.externalId}`} style={styles.collectionCard}>
                      <Image source={item.imageUrl ? { uri: item.imageUrl } : fragranceFallback} style={styles.collectionImage} />
                      <View style={styles.collectionMeta}>
                        <Text style={styles.collectionName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.collectionBrand} numberOfLines={1}>{item.brand || "-"}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>No community fragrances yet.</Text></View>
              )}
            </View>
          ) : null}

          {activeTab === "posts" ? (
            <View style={[styles.sectionCard, styles.sectionWrap]}>
              <SectionHeading icon="document-text-outline" title="Posts" subtitle="Scent-of-the-day and activity posts." />
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No posts yet. Share your scent of the day from Home.</Text></View>
            </View>
          ) : null}
        </ScrollView>

        <Modal
          visible={Boolean(collectionActionItem)}
          transparent
          animationType="fade"
          onRequestClose={closeCollectionItemActions}
        >
          <View style={styles.sheetBackdrop}>
            <Pressable style={styles.sheetBackdropPress} onPress={closeCollectionItemActions} />
            <View style={styles.sheetCard}>
              <Text style={styles.sheetTitle}>Manage Collection Item</Text>
              <Text style={styles.sheetItemName} numberOfLines={2}>{collectionActionItem?.name ?? ""}</Text>
              <Text style={styles.sheetItemBrand} numberOfLines={1}>{collectionActionItem?.brand || "—"}</Text>

              <View style={styles.sheetActions}>
                <Pressable
                  style={[styles.sheetActionBtn, actionBusy && styles.sheetActionBtnDisabled]}
                  disabled={actionBusy || !collectionActionItem}
                  onPress={() => collectionActionItem && void runCollectionItemAction(collectionActionItem, "set1")}
                >
                  <Text style={styles.sheetActionText}>Set as Top #1</Text>
                </Pressable>
                <Pressable
                  style={[styles.sheetActionBtn, actionBusy && styles.sheetActionBtnDisabled]}
                  disabled={actionBusy || !collectionActionItem}
                  onPress={() => collectionActionItem && void runCollectionItemAction(collectionActionItem, "set2")}
                >
                  <Text style={styles.sheetActionText}>Set as Top #2</Text>
                </Pressable>
                <Pressable
                  style={[styles.sheetActionBtn, actionBusy && styles.sheetActionBtnDisabled]}
                  disabled={actionBusy || !collectionActionItem}
                  onPress={() => collectionActionItem && void runCollectionItemAction(collectionActionItem, "set3")}
                >
                  <Text style={styles.sheetActionText}>Set as Top #3</Text>
                </Pressable>
                {actionItemIsTop ? (
                  <Pressable
                    style={[styles.sheetActionBtn, actionBusy && styles.sheetActionBtnDisabled]}
                    disabled={actionBusy || !collectionActionItem}
                    onPress={() => collectionActionItem && void runCollectionItemAction(collectionActionItem, "removeTop")}
                  >
                    <Text style={styles.sheetActionText}>Remove from Top 3</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.sheetActionBtn, styles.sheetActionBtnDanger, actionBusy && styles.sheetActionBtnDisabled]}
                  disabled={actionBusy || !collectionActionItem}
                  onPress={() => collectionActionItem && void runCollectionItemAction(collectionActionItem, "removeCollection")}
                >
                  <Text style={styles.sheetActionTextDanger}>Remove from Collection</Text>
                </Pressable>
              </View>

              <Pressable style={styles.sheetCancelBtn} onPress={closeCollectionItemActions} disabled={actionBusy}>
                <Text style={styles.sheetCancelText}>{actionBusy ? "Working..." : "Cancel"}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={Boolean(reviewActionItem)}
          transparent
          animationType="fade"
          onRequestClose={() => (reviewActionBusy ? null : setReviewActionItem(null))}
        >
          <View style={styles.sheetBackdrop}>
            <Pressable style={styles.sheetBackdropPress} onPress={() => (reviewActionBusy ? null : setReviewActionItem(null))} />
            <View style={styles.sheetCard}>
              <Text style={styles.sheetTitle}>Review Actions</Text>
              <Text style={styles.sheetItemName} numberOfLines={2}>{reviewActionItem?.fragranceName || "Review"}</Text>
              <View style={styles.sheetActions}>
                <Pressable
                  style={[styles.sheetActionBtn, reviewActionBusy && styles.sheetActionBtnDisabled]}
                  disabled={reviewActionBusy || !reviewActionItem}
                  onPress={() => reviewActionItem && void onReportReview(reviewActionItem)}
                >
                  <Text style={styles.sheetActionText}>Report review</Text>
                </Pressable>
                <Pressable
                  style={[styles.sheetActionBtn, styles.sheetActionBtnDanger, reviewActionBusy && styles.sheetActionBtnDisabled]}
                  disabled={reviewActionBusy || !reviewActionItem}
                  onPress={() => reviewActionItem && void onDeleteReview(reviewActionItem)}
                >
                  <Text style={styles.sheetActionTextDanger}>Delete review</Text>
                </Pressable>
              </View>
              <Pressable
                style={styles.sheetCancelBtn}
                onPress={() => (reviewActionBusy ? null : setReviewActionItem(null))}
                disabled={reviewActionBusy}
              >
                <Text style={styles.sheetCancelText}>{reviewActionBusy ? "Working..." : "Cancel"}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={Boolean(wishlistActionItem)}
          transparent
          animationType="fade"
          onRequestClose={() => (wishlistActionBusy ? null : setWishlistActionItem(null))}
        >
          <View style={styles.sheetBackdrop}>
            <Pressable style={styles.sheetBackdropPress} onPress={() => (wishlistActionBusy ? null : setWishlistActionItem(null))} />
            <View style={styles.sheetCard}>
              <Text style={styles.sheetTitle}>Manage Wishlist Item</Text>
              <Text style={styles.sheetItemName} numberOfLines={2}>{wishlistActionItem?.name ?? ""}</Text>
              <Text style={styles.sheetItemBrand} numberOfLines={1}>{wishlistActionItem?.brand || "—"}</Text>
              <View style={styles.sheetActions}>
                <Pressable
                  style={[styles.sheetActionBtn, wishlistActionBusy && styles.sheetActionBtnDisabled]}
                  disabled={wishlistActionBusy || !wishlistActionItem}
                  onPress={() => void runWishlistAction("purchased")}
                >
                  <Text style={styles.sheetActionText}>Purchased (Move to Collection)</Text>
                </Pressable>
                <Pressable
                  style={[styles.sheetActionBtn, styles.sheetActionBtnDanger, wishlistActionBusy && styles.sheetActionBtnDisabled]}
                  disabled={wishlistActionBusy || !wishlistActionItem}
                  onPress={() => void runWishlistAction("remove")}
                >
                  <Text style={styles.sheetActionTextDanger}>Remove from Wishlist</Text>
                </Pressable>
              </View>
              <Pressable
                style={styles.sheetCancelBtn}
                onPress={() => (wishlistActionBusy ? null : setWishlistActionItem(null))}
                disabled={wishlistActionBusy}
              >
                <Text style={styles.sheetCancelText}>{wishlistActionBusy ? "Working..." : "Cancel"}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#070A11",
  },
  flex: {
    flex: 1,
  },
  screenPad: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pageScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 10,
  },
  iconTabsStickyWrap: {
    width: "100%",
    backgroundColor: "#070A11",
    marginTop: 2,
    zIndex: 5,
  },
  iconTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingTop: 6,
    columnGap: 8,
    backgroundColor: "#070A11",
  },
  iconTabBtn: {
    flex: 1,
    minWidth: 0,
    height: 36,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
    gap: 7,
  },
  iconTabUnderline: {
    width: "100%",
    height: 2,
    borderRadius: 0,
    backgroundColor: "transparent",
  },
  iconTabUnderlineActive: {
    backgroundColor: "#67E8F9",
  },
  headerCard: {
    padding: 0,
  },
  sectionCard: {
    padding: 0,
  },
  metricsSectionCard: {
    paddingTop: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#FFFFFF24",
    marginVertical: 2,
  },
  settingsTopRight: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  centerState: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  subtleText: {
    color: "#FFFFFFB3",
    fontSize: 13,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F8717160",
    backgroundColor: "#F8717120",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: "#FECACA",
    fontSize: 13,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  avatarWrap: {
    paddingTop: 2,
    alignItems: "center",
  },
  avatarHalo: {
    borderRadius: 30,
    padding: 2,
    backgroundColor: "#67E8F92A",
    shadowColor: "#22D3EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#67E8F980",
    backgroundColor: "#FFFFFF20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFFF0",
    fontSize: 28,
    fontWeight: "700",
  },
  avatarVisibility: {
    marginTop: 6,
    color: "#FFFFFFA8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  headerMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  displayName: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.3,
    maxWidth: "88%",
  },
  inlineUsername: {
    color: "#BAE6FD",
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 130,
  },
  inlineUsernamePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#67E8F952",
    backgroundColor: "#22D3EE24",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bioText: {
    marginTop: 9,
    color: "#FFFFFFD4",
    fontSize: 13,
    lineHeight: 18,
  },
  followRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  followText: {
    color: "#FFFFFFCC",
    fontSize: 13,
  },
  followCount: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  halfStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  repInlineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    borderWidth: 1,
    borderColor: "#FCD34D4D",
    backgroundColor: "#F59E0B1A",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  repInlineLabel: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  repInlineValue: {
    color: "#F8FAFC",
    fontSize: 10,
    fontWeight: "600",
  },
  primaryBtn: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryBtnText: {
    color: "#0B0F18",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF2E",
    backgroundColor: "#FFFFFF14",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: "#FFFFFFE0",
    fontSize: 13,
    fontWeight: "600",
  },
  disabledBtn: {
    opacity: 0.7,
  },
  separator: {
    height: 1,
    backgroundColor: "#FFFFFF1E",
    marginVertical: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    width: "48.8%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FFFFFF24",
    backgroundColor: "#FFFFFF0B",
    padding: 10,
  },
  statCardCyan: {
    borderColor: "#22D3EE42",
    backgroundColor: "#22D3EE14",
  },
  statCardGold: {
    borderColor: "#FCD34D42",
    backgroundColor: "#FCD34D14",
  },
  statCardBlue: {
    borderColor: "#60A5FA42",
    backgroundColor: "#60A5FA14",
  },
  statCardRose: {
    borderColor: "#FB718542",
    backgroundColor: "#FB718514",
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconCyan: {
    borderColor: "#67E8F966",
    backgroundColor: "#22D3EE22",
  },
  statIconGold: {
    borderColor: "#FDE68A66",
    backgroundColor: "#F59E0B22",
  },
  statIconBlue: {
    borderColor: "#93C5FD66",
    backgroundColor: "#3B82F622",
  },
  statIconRose: {
    borderColor: "#FDA4AF66",
    backgroundColor: "#F43F5E22",
  },
  statLabel: {
    color: "#FFFFFFC0",
    fontSize: 12,
    fontWeight: "600",
  },
  statValue: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statHint: {
    marginTop: 4,
    color: "#FFFFFFA8",
    fontSize: 10,
    lineHeight: 13,
  },
  sectionWrap: {
    gap: 8,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  sectionHeadingIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#67E8F950",
    backgroundColor: "#22D3EE20",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeadingText: {
    gap: 1,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionSub: {
    color: "#FFFFFF99",
    fontSize: 12,
  },
  collectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  collectionFilters: {
    flexDirection: "row",
    gap: 6,
    marginTop: 1,
  },
  filterBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#67E8F955",
    backgroundColor: "#22D3EE1A",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filterBtnText: {
    color: "#CFFAFE",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  rowCards: {
    paddingVertical: 6,
    gap: 10,
  },
  topThreeRow: {
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  topThreeSlotBase: {
    maxWidth: 220,
  },
  topThreeSlotOne: {
    width: "100%",
  },
  topThreeSlotTwo: {
    width: "48.6%",
  },
  topThreeSlotThree: {
    width: "31.6%",
  },
  fragranceCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#67E8F952",
    backgroundColor: "#0B1224",
    padding: 7,
    overflow: "hidden",
    shadowColor: "#22D3EE",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  fragranceGlow: {
    position: "absolute",
    top: -28,
    right: -18,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#22D3EE26",
  },
  rankBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FFFFFF2A",
    backgroundColor: "#00000066",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  rankBadgeHash: {
    fontSize: 10,
    fontWeight: "800",
  },
  rankBadgeText: {
    color: "#E2E8F0",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.35,
    textTransform: "uppercase",
  },
  fragranceImage: {
    width: "100%",
    aspectRatio: 0.66,
    borderRadius: 12,
    backgroundColor: "#0F172A",
  },
  fragranceMeta: {
    marginTop: 6,
    gap: 2,
  },
  fragranceName: {
    color: "#FFFFFFFA",
    fontSize: 11,
    fontWeight: "700",
  },
  fragranceBrand: {
    color: "#A5F3FC",
    fontSize: 9,
    fontWeight: "600",
  },
  fragranceRatingRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  fragranceRatingText: {
    color: "#FDE68A",
    fontSize: 9,
    fontWeight: "700",
  },
  fragranceRatingMuted: {
    color: "#FFFFFF7A",
    fontSize: 9,
    fontWeight: "600",
  },
  emptyCallout: {
    marginTop: 6,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
    backgroundColor: "#F59E0B14",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  emptyCalloutText: {
    color: "#FFFFFFB5",
    fontSize: 12,
  },
  subSeparator: {
    height: 1,
    backgroundColor: "#FFFFFF1E",
    marginTop: 6,
    marginBottom: 2,
  },
  collectionList: {
    gap: 10,
    paddingTop: 4,
  },
  collectionShelfGrid: {
    marginTop: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  collectionShelfCard: {
    width: "48.6%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFFFFF1F",
    backgroundColor: "#0A101C",
    padding: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  collectionMoreBtn: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  collectionShelfImage: {
    width: "100%",
    height: 130,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#67E8F944",
    backgroundColor: "#FFFFFF12",
  },
  collectionShelfMeta: {
    marginTop: 8,
    gap: 2,
  },
  collectionNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  collectionShelfName: {
    color: "#FFFFFFF0",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 15,
    flex: 1,
  },
  collectionShelfBrand: {
    color: "#A5F3FC",
    fontSize: 10,
    fontWeight: "600",
  },
  collectionRatingRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  collectionRatingText: {
    color: "#FDE68A",
    fontSize: 10,
    fontWeight: "600",
  },
  collectionRatingTextMuted: {
    color: "#FFFFFF7A",
    fontSize: 10,
    fontWeight: "600",
  },
  reviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF1A",
    backgroundColor: "#00000046",
    padding: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    position: "relative",
  },
  reviewMoreBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  reviewImage: {
    width: 52,
    height: 66,
    borderRadius: 8,
    backgroundColor: "#FFFFFF12",
  },
  reviewMediaCol: {
    alignItems: "center",
    gap: 5,
  },
  reviewMeta: {
    flex: 1,
    gap: 4,
  },
  reviewTitle: {
    color: "#FFFFFFEB",
    fontSize: 14,
    fontWeight: "700",
  },
  reviewBrandText: {
    color: "#A5F3FC",
    fontSize: 11,
    fontWeight: "600",
    marginTop: -1,
  },
  reviewRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewExcerpt: {
    color: "#FFFFFFB8",
    fontSize: 12,
    lineHeight: 16,
  },
  reviewFooterRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewDetailsToggle: {
    color: "#FFFFFFB5",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  reviewTimeText: {
    color: "#FFFFFF7A",
    fontSize: 11,
  },
  reviewActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  reviewActionCount: {
    color: "#FFFFFFA6",
    fontSize: 11,
    fontWeight: "600",
  },
  reviewDetailsPanel: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#FFFFFF14",
    paddingTop: 8,
    gap: 10,
  },
  reviewDetailSection: {
    gap: 6,
  },
  reviewDetailHeading: {
    color: "#FFFFFF88",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  reviewDetailMetric: {
    gap: 4,
  },
  reviewDetailMetricTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewDetailLabel: {
    color: "#FFFFFFB0",
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  reviewDetailValue: {
    color: "#FFFFFFC8",
    fontSize: 11,
    fontWeight: "600",
  },
  reviewDetailBarTrack: {
    height: 6,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#FFFFFF15",
    overflow: "hidden",
  },
  reviewDetailBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#3EB489",
  },
  reviewPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 2,
  },
  reviewPricePill: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  reviewPricePillRed: {
    color: "#FECACA",
    backgroundColor: "#DC262633",
  },
  reviewPricePillOrange: {
    color: "#FED7AA",
    backgroundColor: "#EA580C33",
  },
  reviewPricePillNeutral: {
    color: "#E2E8F0",
    backgroundColor: "#FFFFFF22",
  },
  reviewPricePillEmerald: {
    color: "#BBF7D0",
    backgroundColor: "#05966933",
  },
  reviewPricePillGreen: {
    color: "#DCFCE7",
    backgroundColor: "#16A34A33",
  },
  collectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF1A",
    backgroundColor: "#00000046",
    padding: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  collectionImage: {
    width: 50,
    height: 62,
    borderRadius: 8,
    backgroundColor: "#FFFFFF12",
  },
  collectionMeta: {
    flex: 1,
  },
  collectionName: {
    color: "#FFFFFFEB",
    fontSize: 14,
    fontWeight: "600",
  },
  collectionBrand: {
    marginTop: 3,
    color: "#FFFFFF9F",
    fontSize: 12,
  },
  emptyCard: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF1A",
    backgroundColor: "#FFFFFF08",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyText: {
    color: "#FFFFFFB0",
    fontSize: 12,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "#0000008C",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    position: "relative",
  },
  sheetBackdropPress: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheetCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFFFFF1A",
    backgroundColor: "#0A0F19",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 10,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  sheetItemName: {
    color: "#FFFFFFE8",
    fontSize: 13,
    fontWeight: "600",
  },
  sheetItemBrand: {
    marginTop: -6,
    color: "#A5F3FC",
    fontSize: 11,
    fontWeight: "600",
  },
  sheetActions: {
    gap: 8,
  },
  sheetActionBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF24",
    backgroundColor: "#FFFFFF10",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sheetActionBtnDanger: {
    borderColor: "#FCA5A544",
    backgroundColor: "#DC262620",
  },
  sheetActionBtnDisabled: {
    opacity: 0.6,
  },
  sheetActionText: {
    color: "#FFFFFFEB",
    fontSize: 13,
    fontWeight: "600",
  },
  sheetActionTextDanger: {
    color: "#FECACA",
    fontSize: 13,
    fontWeight: "700",
  },
  sheetCancelBtn: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#67E8F955",
    backgroundColor: "#22D3EE14",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCancelText: {
    color: "#BAE6FD",
    fontSize: 13,
    fontWeight: "700",
  },
});
