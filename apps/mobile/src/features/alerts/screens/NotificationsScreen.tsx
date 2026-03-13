import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { listPendingFollowRequests } from "../../../lib/api/follows";
import { getMe } from "../../../lib/api/me";
import { deleteNotification, listNotifications } from "../../../lib/api/notifications";
import type { NotificationItem, PendingFollowRequestItem } from "../../../lib/api/types";
import type { AlertsStackParamList } from "../navigation/AlertsStackNavigator";
import { dayBucket, DEFAULT_AVATAR_URI, iconNameFor, messageFor, metaFor, relativeTime, when } from "../utils";

type AlertsNavigation = NativeStackNavigationProp<AlertsStackParamList, "Notifications">;

function NotificationRow({
  item,
  deleting,
  onDelete,
  onPress,
}: {
  item: NotificationItem;
  deleting: boolean;
  onDelete: (notificationId: string) => void;
  onPress: (item: NotificationItem) => void;
}) {
  return (
    <View style={styles.rowShell}>
      <Swipeable
        overshootRight={false}
        friction={2}
        rightThreshold={32}
        renderRightActions={() => (
          <View style={styles.swipeActionsWrap}>
            <RectButton
              style={[styles.swipeDeleteAction, deleting && styles.disabled]}
              enabled={!deleting}
              onPress={() => onDelete(item.id)}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.swipeDeleteText}>Delete</Text>
                </>
              )}
            </RectButton>
          </View>
        )}
      >
        <View style={styles.rowCard}>
          <Pressable style={styles.avatarWrap} onPress={() => onPress(item)}>
            <Image source={{ uri: item.actorAvatarUrl?.trim() || DEFAULT_AVATAR_URI }} style={styles.avatar} />
          </Pressable>
          <Pressable style={styles.rowMain} onPress={() => onPress(item)}>
            <View style={styles.rowContent}>
              <Text style={styles.rowText}>
                <Text style={styles.rowActor}>{item.actorDisplayName || item.actorUsername}</Text>
                <Text> {messageFor(item)}</Text>
              </Text>
              <View style={styles.rowMeta}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name={iconNameFor(item)} size={14} color="#D1D5DB" />
                </View>
                <Text style={styles.rowMetaText}>{metaFor(item)}</Text>
                <Text style={styles.rowMetaDot}>•</Text>
                <Text style={styles.rowMetaText} accessibilityLabel={when(item.createdAt)}>
                  {relativeTime(item.createdAt)}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      </Swipeable>
    </View>
  );
}

export function NotificationsScreen() {
  const navigation = useNavigation<AlertsNavigation>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<PendingFollowRequestItem[]>([]);
  const [hasMorePending, setHasMorePending] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [notificationsCursor, setNotificationsCursor] = useState<string | null>(null);
  const [loadingMoreNotifications, setLoadingMoreNotifications] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [me, notificationsPage] = await Promise.all([getMe(), listNotifications({ limit: 20 })]);
      setIsPrivateAccount(Boolean(me.isPrivate));
      setItems(notificationsPage.items);
      setNotificationsCursor(notificationsPage.nextCursor);

      if (me.isPrivate) {
        const pendingPage = await listPendingFollowRequests({ limit: 4 });
        setPendingPreview(pendingPage.items);
        setHasMorePending(Boolean(pendingPage.nextCursor));
      } else {
        setPendingPreview([]);
        setHasMorePending(false);
      }
    } catch (err) {
      setError((err as { message?: string })?.message || "Failed to load notifications.");
    } finally {
      if (mode === "refresh") setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load("initial");
    }, [load])
  );

  const headerLabel = useMemo(() => {
    if (items.length <= 0) return "No recent activity";
    return `${items.length} recent notification${items.length === 1 ? "" : "s"}`;
  }, [items.length]);

  const sections = useMemo(() => {
    const buckets = new Map<string, NotificationItem[]>();
    for (const item of items) {
      const key = dayBucket(item.createdAt);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)?.push(item);
    }
    return ["Today", "Yesterday", "This week", "Earlier"]
      .map((title) => ({ title, data: buckets.get(title) ?? [] }))
      .filter((section) => section.data.length > 0);
  }, [items]);

  async function loadMoreNotifications() {
    if (!notificationsCursor || loadingMoreNotifications) return;
    setLoadingMoreNotifications(true);
    setError(null);
    try {
      const page = await listNotifications({ limit: 20, cursor: notificationsCursor });
      setItems((prev) => [...prev, ...page.items]);
      setNotificationsCursor(page.nextCursor);
    } catch (err) {
      setError((err as { message?: string })?.message || "Failed to load more notifications.");
    } finally {
      setLoadingMoreNotifications(false);
    }
  }

  async function onDeleteNotification(notificationId: string) {
    setDeletingNotificationId(notificationId);
    setError(null);
    try {
      await deleteNotification(notificationId);
      setItems((prev) => prev.filter((item) => item.id !== notificationId));
    } catch (err) {
      setError((err as { message?: string })?.message || "Failed to delete notification.");
    } finally {
      setDeletingNotificationId(null);
    }
  }

  async function onRefresh() {
    await load("refresh");
  }

  function onOpenNotification(item: NotificationItem) {
    if (item.type === "MODERATION_STRIKE") return;
    if ((item.type === "REVIEW_COMMENTED" || item.type === "REVIEW_COMMENT_REPLIED") && item.sourceReviewId) {
      Alert.alert("Not wired yet", "Post detail navigation is not implemented in the mobile app yet.");
      return;
    }
    Alert.alert("Not wired yet", "Public profile navigation is not implemented in the mobile app yet.");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <SectionList
        sections={loading ? [] : sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#67E8F9"
            progressBackgroundColor="#0B1220"
          />
        }
        ListHeaderComponent={(
          <View>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.topTitle}>Notifications</Text>
                <Text style={styles.topSubtitle}>{headerLabel}</Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isPrivateAccount && pendingPreview.length > 0 ? (
              <Pressable style={styles.requestsStrip} onPress={() => navigation.navigate("FollowRequests")}>
                <View style={styles.requestsIconWrap}>
                  <Ionicons name="people" size={16} color="#A5F3FC" />
                </View>
                <View style={styles.requestsBody}>
                  <Text style={styles.requestsTitle}>Follow requests</Text>
                  <Text style={styles.requestsText}>
                    {pendingPreview.slice(0, 3).map((req) => req.displayName || req.username).join(", ")}
                    {pendingPreview.length > 3 || hasMorePending ? ", and more" : ""}
                  </Text>
                </View>
                <View style={styles.requestsMeta}>
                  <Text style={styles.requestsCount}>{hasMorePending ? "4+" : pendingPreview.length}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FFFFFF80" />
                </View>
              </Pressable>
            ) : null}

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#67E8F9" />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : null}

            {!loading && items.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="notifications-off-outline" size={22} color="#A5B4FC" />
                </View>
                <Text style={styles.emptyTitle}>You're all caught up</Text>
                <Text style={styles.emptyText}>New follows, likes, comments, and replies will land here.</Text>
              </View>
            ) : null}
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.groupHeaderWrap}>
            <Text style={styles.groupLabel}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            deleting={deletingNotificationId === item.id}
            onDelete={(notificationId) => void onDeleteNotification(notificationId)}
            onPress={onOpenNotification}
          />
        )}
        ListFooterComponent={
          !loading && items.length > 0 ? (
            notificationsCursor ? (
              <Pressable
                style={[styles.loadMoreButton, loadingMoreNotifications && styles.disabled]}
                disabled={loadingMoreNotifications}
                onPress={() => void loadMoreNotifications()}
              >
                {loadingMoreNotifications ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <Text style={styles.loadMoreText}>{loadingMoreNotifications ? "Loading" : "Load more"}</Text>
              </Pressable>
            ) : (
              <View style={styles.footerSpace} />
            )
          ) : (
            <View style={styles.footerSpace} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#070A11" },
  content: { paddingBottom: 24 },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  topSubtitle: { color: "#FFFFFF8C", fontSize: 13, marginTop: 2 },
  errorCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EF444455",
    backgroundColor: "#7F1D1D66",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: "#FECACA", fontSize: 13, lineHeight: 18 },
  requestsStrip: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: "#0D1526",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  requestsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#112033",
    alignItems: "center",
    justifyContent: "center",
  },
  requestsBody: { flex: 1 },
  requestsTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  requestsText: { color: "#FFFFFF8C", fontSize: 12, marginTop: 2 },
  requestsMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  requestsCount: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.55 },
  loadingWrap: { paddingVertical: 30, alignItems: "center", gap: 10 },
  loadingText: { color: "#FFFFFFA8", fontSize: 13 },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  emptyText: { color: "#FFFFFF88", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 },
  groupHeaderWrap: {
    backgroundColor: "#070A11F2",
    paddingTop: 10,
    paddingBottom: 8,
  },
  groupLabel: {
    color: "#FFFFFF73",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingHorizontal: 16,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#070A11",
  },
  rowShell: {
    overflow: "hidden",
    backgroundColor: "#070A11",
  },
  avatarWrap: { paddingTop: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0F172A",
  },
  rowMain: {
    flex: 1,
  },
  rowContent: {
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#FFFFFF14",
    paddingBottom: 12,
  },
  rowText: { color: "#E5E7EB", fontSize: 15, lineHeight: 21 },
  rowActor: { color: "#FFFFFF", fontWeight: "700" },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101826",
  },
  rowMetaText: { color: "#FFFFFF8A", fontSize: 12 },
  rowMetaDot: { color: "#FFFFFF5C", fontSize: 12 },
  swipeActionsWrap: {
    width: 80,
    justifyContent: "center",
    alignItems: "stretch",
    backgroundColor: "#070A11",
  },
  swipeDeleteAction: {
    flex: 1,
    backgroundColor: "#ED4956",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginBottom: StyleSheet.hairlineWidth,
  },
  swipeDeleteText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  loadMoreButton: {
    marginHorizontal: 16,
    marginTop: 8,
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loadMoreText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  footerSpace: { height: 24 },
});
