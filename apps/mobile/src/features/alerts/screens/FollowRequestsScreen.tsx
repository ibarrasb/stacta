import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { acceptFollowRequest, declineFollowRequest, listPendingFollowRequests } from "../../../lib/api/follows";
import { getMe } from "../../../lib/api/me";
import type { PendingFollowRequestItem } from "../../../lib/api/types";
import type { AlertsStackParamList } from "../navigation/AlertsStackNavigator";
import { DEFAULT_AVATAR_URI, relativeTime, when } from "../utils";

type FollowRequestsNavigation = NativeStackNavigationProp<AlertsStackParamList, "FollowRequests">;

export function FollowRequestsScreen() {
  const navigation = useNavigation<FollowRequestsNavigation>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [pending, setPending] = useState<PendingFollowRequestItem[]>([]);
  const [pendingCursor, setPendingCursor] = useState<string | null>(null);
  const [loadingMorePending, setLoadingMorePending] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingType, setActingType] = useState<"accept" | "decline" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      setIsPrivateAccount(Boolean(me.isPrivate));
      if (!me.isPrivate) {
        setPending([]);
        setPendingCursor(null);
        return;
      }
      const pendingPage = await listPendingFollowRequests({ limit: 20 });
      setPending(pendingPage.items);
      setPendingCursor(pendingPage.nextCursor);
    } catch (err) {
      setError((err as { message?: string })?.message || "Failed to load follow requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function onAccept(requestId: string) {
    setActingId(requestId);
    setActingType("accept");
    setError(null);
    try {
      await acceptFollowRequest(requestId);
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message || "Failed to accept follow request.");
    } finally {
      setActingId(null);
      setActingType(null);
    }
  }

  async function onDecline(requestId: string) {
    setActingId(requestId);
    setActingType("decline");
    setError(null);
    try {
      await declineFollowRequest(requestId);
      await load();
    } catch (err) {
      setError((err as { message?: string })?.message || "Failed to decline follow request.");
    } finally {
      setActingId(null);
      setActingType(null);
    }
  }

  async function loadMorePending() {
    if (!pendingCursor || loadingMorePending) return;
    setLoadingMorePending(true);
    setError(null);
    try {
      const page = await listPendingFollowRequests({ limit: 20, cursor: pendingCursor });
      setPending((prev) => [...prev, ...page.items]);
      setPendingCursor(page.nextCursor);
    } catch (err) {
      setError((err as { message?: string })?.message || "Failed to load more pending requests.");
    } finally {
      setLoadingMorePending(false);
    }
  }

  function onOpenProfile() {
    Alert.alert("Not wired yet", "Public profile navigation is not implemented in the mobile app yet.");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#FFFFFFE6" />
          </Pressable>
          <View style={styles.topBarText}>
            <Text style={styles.title}>Follow Requests</Text>
            <Text style={styles.subtitle}>Approve or decline private-account follow requests.</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Requests</Text>
          {isPrivateAccount ? <Text style={styles.pendingBadge}>{pending.length} pending</Text> : null}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#67E8F9" />
            <Text style={styles.loadingText}>Loading follow requests...</Text>
          </View>
        ) : !isPrivateAccount ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Your profile is public, so follow requests are not used.</Text>
          </View>
        ) : pending.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You have no pending follow requests.</Text>
          </View>
        ) : (
          <View style={styles.requestList}>
            {pending.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <Pressable style={styles.avatarWrap} onPress={onOpenProfile}>
                  <Image source={{ uri: req.avatarUrl?.trim() || DEFAULT_AVATAR_URI }} style={styles.avatar} />
                </Pressable>
                <Pressable style={styles.requestMain} onPress={onOpenProfile}>
                  <Text style={styles.requestText}>
                    <Text style={styles.requestActor}>{req.displayName || req.username}</Text>
                    <Text> requested to follow you.</Text>
                  </Text>
                  <View style={styles.requestMeta}>
                    <View style={styles.metaIconWrap}>
                      <Ionicons name="person-add-outline" size={14} color="#D1D5DB" />
                    </View>
                    <Text style={styles.metaText} accessibilityLabel={when(req.requestedAt)}>
                      {relativeTime(req.requestedAt)}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.secondaryButton, actingId === req.id && styles.disabled]}
                    disabled={actingId === req.id}
                    onPress={() => void onDecline(req.id)}
                  >
                    {actingId === req.id && actingType === "decline" ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.secondaryButtonText}>Decline</Text>}
                  </Pressable>
                  <Pressable
                    style={[styles.primaryButton, actingId === req.id && styles.disabled]}
                    disabled={actingId === req.id}
                    onPress={() => void onAccept(req.id)}
                  >
                    {actingId === req.id && actingType === "accept" ? <ActivityIndicator size="small" color="#0B0F18" /> : <Text style={styles.primaryButtonText}>Accept</Text>}
                  </Pressable>
                </View>
              </View>
            ))}

            {pendingCursor ? (
              <Pressable
                style={[styles.loadMoreButton, loadingMorePending && styles.disabled]}
                disabled={loadingMorePending}
                onPress={() => void loadMorePending()}
              >
                {loadingMorePending ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <Text style={styles.loadMoreText}>{loadingMorePending ? "Loading" : "Load more requests"}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
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
    gap: 10,
    alignItems: "center",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFFFFF10",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarText: { flex: 1 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { marginTop: 2, color: "#FFFFFF8C", fontSize: 13, lineHeight: 18 },
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
  sectionHeader: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionLabel: { color: "#FFFFFF73", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 },
  pendingBadge: {
    color: "#FFFFFFB8",
    fontSize: 11,
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  loadingWrap: { paddingVertical: 30, alignItems: "center", gap: 10 },
  loadingText: { color: "#FFFFFFA8", fontSize: 13 },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  emptyText: { color: "#FFFFFF88", fontSize: 13, lineHeight: 19, textAlign: "center" },
  requestList: { gap: 0 },
  requestCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarWrap: { paddingTop: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#0F172A",
  },
  requestMain: {
    flex: 1,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#FFFFFF14",
    paddingBottom: 12,
  },
  requestText: { color: "#E5E7EB", fontSize: 15, lineHeight: 21 },
  requestActor: { color: "#FFFFFF", fontWeight: "700" },
  requestMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101826",
  },
  metaText: { color: "#FFFFFF8A", fontSize: 12 },
  actionRow: {
    flexDirection: "column",
    width: 88,
    gap: 8,
    paddingTop: 2,
  },
  secondaryButton: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  secondaryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  primaryButton: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  primaryButtonText: { color: "#0B0F18", fontSize: 12, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  loadMoreButton: {
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  loadMoreText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
});
