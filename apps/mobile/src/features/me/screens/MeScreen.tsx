import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMe } from "../../../lib/api/me";
import type { CollectionItem, MeResponse } from "../../../lib/api/types";
import stactaLogo from "../../../../assets/stacta.png";

type ProfileTab = "overview" | "reviews" | "wishlist" | "community" | "posts";

function initials(value: string) {
  const clean = value.trim();
  if (!clean) return "S";
  const parts = clean.split(/[.@\s_-]+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function compactCount(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) < 10_000) return String(Math.trunc(n));
  return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
}

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

function TabIcon({ tabId, active }: { tabId: ProfileTab; active: boolean }) {
  const color = active ? "#A5F3FC" : "#FFFFFF73";
  const name: keyof typeof Ionicons.glyphMap =
    tabId === "overview"
      ? "home-outline"
      : tabId === "reviews"
        ? "chatbubble-outline"
        : tabId === "wishlist"
          ? "heart-outline"
          : tabId === "community"
            ? "people-outline"
            : "document-text-outline";
  return <Ionicons name={name} size={15} color={color} />;
}

function FragranceCard({ item, topLabel }: { item: CollectionItem; topLabel?: string }) {
  return (
    <View style={styles.fragranceCard}>
      {topLabel ? <Text style={styles.topLabel}>{topLabel}</Text> : null}
      <Image source={item.imageUrl ? { uri: item.imageUrl } : stactaLogo} style={styles.fragranceImage} resizeMode="cover" />
      <Text style={styles.fragranceName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.fragranceBrand} numberOfLines={1}>{item.brand || "-"}</Text>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);

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

  const tabs: Array<{ id: ProfileTab; label: string; count?: number }> = [
    { id: "overview", label: "Overview", count: me?.collectionCount ?? 0 },
    { id: "reviews", label: "Reviews", count: me?.reviewCount ?? 0 },
    { id: "wishlist", label: "Wishlist", count: me?.wishlistCount ?? 0 },
    { id: "community", label: "Community", count: me?.communityFragranceCount ?? 0 },
    { id: "posts", label: "Posts" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 10 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#A5F3FC" />
            <Text style={styles.subtleText}>Loading profile...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && !error ? (
          <>
            <View style={styles.headerCard}>
              <Pressable style={styles.settingsTopRight} onPress={onOpenSettings}>
                <Ionicons name="settings-outline" size={18} color="#FFFFFFD9" />
              </Pressable>

              <View style={styles.headerRow}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initials(displayName)}</Text>
                  </View>
                  <Text style={styles.avatarVisibility}>{me?.isPrivate ? "Private" : "Public"}</Text>
                </View>

                <View style={styles.headerMeta}>
                  <View style={styles.nameRow}>
                    <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
                    <View style={styles.inlineUsernamePill}>
                      <Text style={styles.inlineUsername} numberOfLines={1}>{usernameLabel}</Text>
                    </View>
                    {me?.isVerified ? <Ionicons name="checkmark-circle" size={16} color="#A5F3FC" /> : null}
                  </View>
                  <View style={styles.followRow}>
                    <Text style={styles.followText}><Text style={styles.followCount}>{compactCount(me?.followersCount)}</Text> followers</Text>
                    <Text style={styles.followText}><Text style={styles.followCount}>{compactCount(me?.followingCount)}</Text> following</Text>
                  </View>
                  <Text style={styles.bioText}>{bio}</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <View style={styles.repInlineCard}>
                  <Ionicons name="sparkles" size={13} color="#FDE68A" />
                  <Text style={styles.repInlineLabel}>Stacta rep</Text>
                  <StarReputation value={Number(me?.creatorRatingAverage ?? 0)} />
                  <Text style={styles.repInlineValue}>
                    {Number(me?.creatorRatingCount ?? 0) > 0
                      ? `${Number(me?.creatorRatingAverage ?? 0).toFixed(2)} • ${me?.creatorRatingCount ?? 0}`
                      : "No ratings"}
                  </Text>
                </View>
                <Pressable style={styles.primaryBtn} onPress={onOpenEditProfile}>
                  <Text style={styles.primaryBtnText}>Edit profile</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionDivider} />

            <View style={styles.sectionCard}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}><Text style={styles.statLabel}>Collection</Text><Text style={styles.statValue}>{me?.collectionCount ?? 0}</Text><Text style={styles.statHint}>Fragrances in your collection</Text></View>
                <View style={styles.statCard}><Text style={styles.statLabel}>Reviews</Text><Text style={styles.statValue}>{me?.reviewCount ?? 0}</Text><Text style={styles.statHint}>Fragrance reviews posted</Text></View>
                <View style={styles.statCard}><Text style={styles.statLabel}>Community fragrances</Text><Text style={styles.statValue}>{me?.communityFragranceCount ?? 0}</Text><Text style={styles.statHint}>Fragrances you contributed</Text></View>
                <View style={styles.statCard}><Text style={styles.statLabel}>Wishlist</Text><Text style={styles.statValue}>{me?.wishlistCount ?? 0}</Text><Text style={styles.statHint}>Fragrances on your wishlist</Text></View>
              </View>

              <View style={styles.separator} />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsWrap}>
                {tabs.map((tab) => {
                  const active = tab.id === activeTab;
                  return (
                    <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tabBtn}>
                      <View style={styles.tabContent}>
                        <TabIcon tabId={tab.id} active={active} />
                        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                        {typeof tab.count === "number" ? <Text style={styles.tabCount}>{tab.count}</Text> : null}
                      </View>
                      <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {activeTab === "overview" ? (
              <View style={[styles.sectionCard, styles.sectionWrap]}>
                <Text style={styles.sectionTitle}>Top 3 Fragrances</Text>
                <Text style={styles.sectionSub}>These are your spotlight picks.</Text>
                {me?.topFragrances?.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowCards}>
                    {me.topFragrances.slice(0, 3).map((item, idx) => (
                      <FragranceCard key={`${item.source}:${item.externalId}`} item={item} topLabel={`Top ${idx + 1}`} />
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyCallout}><Text style={styles.emptyCalloutText}>Pick up to 3 from your collection using Set Top 3.</Text></View>
                )}

                <View style={styles.subSeparator} />

                <Text style={styles.sectionTitle}>Collection</Text>
                <Text style={styles.sectionSub}>Fragrances you have added.</Text>
                {me?.collectionItems?.length ? (
                  <View style={styles.collectionList}>
                    {me.collectionItems.slice(0, 6).map((item) => (
                      <View key={`${item.source}:${item.externalId}`} style={styles.collectionCard}>
                        <Image source={item.imageUrl ? { uri: item.imageUrl } : stactaLogo} style={styles.collectionImage} />
                        <View style={styles.collectionMeta}>
                          <Text style={styles.collectionName} numberOfLines={2}>{item.name}</Text>
                          <Text style={styles.collectionBrand} numberOfLines={1}>{item.brand || "-"}</Text>
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
                <Text style={styles.sectionTitle}>Reviews</Text>
                <Text style={styles.sectionSub}>You have posted {me?.reviewCount ?? 0} review(s).</Text>
                <View style={styles.emptyCard}><Text style={styles.emptyText}>No reviews yet. Post one from a fragrance detail page.</Text></View>
              </View>
            ) : null}

            {activeTab === "wishlist" ? (
              <View style={[styles.sectionCard, styles.sectionWrap]}>
                <Text style={styles.sectionTitle}>Wishlist</Text>
                <Text style={styles.sectionSub}>Fragrances you want to buy or sample.</Text>
                {me?.wishlistItems?.length ? (
                  <View style={styles.collectionList}>
                    {me.wishlistItems.slice(0, 8).map((item) => (
                      <View key={`${item.source}:${item.externalId}`} style={styles.collectionCard}>
                        <Image source={item.imageUrl ? { uri: item.imageUrl } : stactaLogo} style={styles.collectionImage} />
                        <View style={styles.collectionMeta}>
                          <Text style={styles.collectionName} numberOfLines={2}>{item.name}</Text>
                          <Text style={styles.collectionBrand} numberOfLines={1}>{item.brand || "-"}</Text>
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
                <Text style={styles.sectionTitle}>Community Fragrances</Text>
                <Text style={styles.sectionSub}>Fragrances you contributed to the community catalog.</Text>
                {me?.communityFragrances?.length ? (
                  <View style={styles.collectionList}>
                    {me.communityFragrances.slice(0, 8).map((item) => (
                      <View key={`${item.source}:${item.externalId}`} style={styles.collectionCard}>
                        <Image source={item.imageUrl ? { uri: item.imageUrl } : stactaLogo} style={styles.collectionImage} />
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
                <Text style={styles.sectionTitle}>Posts</Text>
                <Text style={styles.sectionSub}>Scent-of-the-day and activity posts.</Text>
                <View style={styles.emptyCard}><Text style={styles.emptyText}>No posts yet. Share your scent of the day from Home.</Text></View>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#070A11",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  headerCard: {
    padding: 0,
  },
  sectionCard: {
    padding: 0,
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
  },
  avatarWrap: {
    paddingTop: 2,
    alignItems: "center",
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#FFFFFF2E",
    backgroundColor: "#FFFFFF1A",
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
  actionsRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFFFFF1A",
    backgroundColor: "#FFFFFF08",
    padding: 10,
  },
  statLabel: {
    color: "#FFFFFF9E",
    fontSize: 11,
  },
  statValue: {
    marginTop: 3,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  statHint: {
    marginTop: 3,
    color: "#FFFFFF73",
    fontSize: 10,
    lineHeight: 13,
  },
  tabsWrap: {
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF1E",
    gap: 16,
    paddingHorizontal: 4,
  },
  tabBtn: {
    paddingTop: 2,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
  },
  tabLabel: {
    color: "#FFFFFFA8",
    fontSize: 13,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  tabCount: {
    borderWidth: 1,
    borderColor: "#FFFFFF26",
    color: "#FFFFFFB0",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontSize: 10,
    overflow: "hidden",
  },
  tabUnderline: {
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  tabUnderlineActive: {
    backgroundColor: "#67E8F9",
  },
  sectionWrap: {
    gap: 8,
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
  rowCards: {
    paddingVertical: 6,
    gap: 10,
  },
  fragranceCard: {
    width: 158,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCD34D4D",
    backgroundColor: "#FCD34D1C",
    padding: 10,
  },
  topLabel: {
    color: "#FDE68A",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  fragranceImage: {
    width: "100%",
    height: 98,
    borderRadius: 10,
    backgroundColor: "#FFFFFF0F",
  },
  fragranceName: {
    marginTop: 8,
    color: "#FFFFFFF2",
    fontSize: 13,
    fontWeight: "600",
  },
  fragranceBrand: {
    color: "#FFFFFFAD",
    fontSize: 11,
    marginTop: 2,
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
});
