import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getMe, updateMe } from "../../../lib/api/me";

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#FFFFFF3A", true: "#22D3EE" }}
      />
    </View>
  );
}

type SettingsScreenProps = {
  onBack: () => void;
  onSignOut: () => Promise<void>;
  submitting: boolean;
};

export function SettingsScreen({ onBack, onSignOut, submitting }: SettingsScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<{ displayName: string; bio: string | null } | null>(null);
  const [privateLoading, setPrivateLoading] = useState(true);
  const [privateSaving, setPrivateSaving] = useState(false);
  const [hideActivity, setHideActivity] = useState(false);
  const [hideCollections, setHideCollections] = useState(false);
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);

  const isProfileDirty = useMemo(
    () => displayName.trim().length > 0 || username.trim().length > 0,
    [displayName, username]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      try {
        const me = await getMe();
        if (cancelled) return;
        setIsPrivate(Boolean(me.isPrivate));
        setProfileSnapshot({ displayName: me.displayName, bio: me.bio });
      } catch (err) {
        if (cancelled) return;
        Alert.alert("Settings", (err as { message?: string })?.message || "Failed to load settings.");
      } finally {
        if (!cancelled) setPrivateLoading(false);
      }
    }
    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onTogglePrivateProfile(next: boolean) {
    if (privateLoading || privateSaving || !profileSnapshot) return;
    const prev = isPrivate;
    setIsPrivate(next);
    setPrivateSaving(true);
    try {
      const updated = await updateMe({
        displayName: profileSnapshot.displayName,
        bio: profileSnapshot.bio,
        isPrivate: next,
      });
      setIsPrivate(Boolean(updated.isPrivate));
      setProfileSnapshot({ displayName: updated.displayName, bio: updated.bio });
    } catch (err) {
      setIsPrivate(prev);
      Alert.alert("Settings", (err as { message?: string })?.message || "Failed to update private profile.");
    } finally {
      setPrivateSaving(false);
    }
  }

  function comingSoon(message: string) {
    Alert.alert("Coming Soon", message);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable style={styles.backBtn} onPress={onBack}>
              <Ionicons name="arrow-back" size={18} color="#FFFFFFE6" />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.kicker}>Controls</Text>
              <Text style={styles.title}>Settings</Text>
              <Text style={styles.subtitle}>Manage your profile, privacy, notifications, and account.</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardDesc}>Update how your profile appears to others.</Text>
          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} placeholderTextColor="#FFFFFF66" />
          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput value={username} onChangeText={setUsername} style={styles.input} placeholderTextColor="#FFFFFF66" />
          <Text style={styles.smallHelp}>Keep it lowercase with letters, numbers, and underscores.</Text>
          <View style={styles.actionRow}>
            <Pressable style={[styles.primaryBtn, !isProfileDirty && styles.disabled]} disabled={!isProfileDirty} onPress={() => comingSoon("Hook this up to your profile update endpoint.")}>
              <Text style={styles.primaryBtnText}>Save changes</Text>
            </Pressable>
            <Pressable style={[styles.secondaryBtn, !isProfileDirty && styles.disabled]} disabled={!isProfileDirty} onPress={() => { setDisplayName(""); setUsername(""); }}>
              <Text style={styles.secondaryBtnText}>Reset</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security</Text>
          <Text style={styles.cardDesc}>Password and sign-in related settings.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => comingSoon("Route this to forgot/change password flow.")}>
            <Text style={styles.secondaryBtnText}>Change password</Text>
          </Pressable>
          <Pressable style={[styles.dangerBtn, submitting && styles.disabled]} disabled={submitting} onPress={onSignOut}>
            <Text style={styles.dangerBtnText}>{submitting ? "Signing out..." : "Sign out"}</Text>
          </Pressable>
          <Text style={styles.smallHelp}>Change password can route to your reset flow, same as web currently.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy & safety</Text>
          <Text style={styles.cardDesc}>Control who can see you and how you interact.</Text>
          <ToggleRow
            label="Private profile"
            description="Only approved followers can see your profile and activity."
            value={isPrivate}
            onChange={onTogglePrivateProfile}
            disabled={privateLoading || privateSaving}
          />
          <ToggleRow
            label="Hide activity"
            description="Hide your recent reviews and logs from others."
            value={hideActivity}
            onChange={setHideActivity}
          />
          <ToggleRow
            label="Hide collections"
            description="Hide your collections from public view."
            value={hideCollections}
            onChange={setHideCollections}
          />
          <Pressable style={styles.secondaryBtn} onPress={() => comingSoon("Blocked users screen.")}>
            <Text style={styles.secondaryBtnText}>Blocked users</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <Text style={styles.cardDesc}>Choose what you want to be notified about.</Text>
          <ToggleRow label="New followers" description="Notify when someone follows you." value={notifFollows} onChange={setNotifFollows} />
          <ToggleRow label="Likes" description="Notify when someone likes your content." value={notifLikes} onChange={setNotifLikes} />
          <ToggleRow label="Comments" description="Notify when someone comments on your content." value={notifComments} onChange={setNotifComments} />
          <ToggleRow label="Weekly digest" description="A weekly recap email." value={notifDigest} onChange={setNotifDigest} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data</Text>
          <Text style={styles.cardDesc}>Download or manage your account data.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => comingSoon("Export my data endpoint.")}>
            <Text style={styles.secondaryBtnText}>Export my data</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal & help</Text>
          <Text style={styles.cardDesc}>Policies, terms, and support.</Text>
          <Pressable style={styles.secondaryBtn} onPress={() => comingSoon("Terms of Service page.")}>
            <Text style={styles.secondaryBtnText}>Terms of Service</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => comingSoon("Privacy Policy page.")}>
            <Text style={styles.secondaryBtnText}>Privacy Policy</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => comingSoon("Contact support page.")}>
            <Text style={styles.secondaryBtnText}>Contact support</Text>
          </Pressable>
          <Text style={styles.smallHelp}>App version: 0.1.0</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Danger zone</Text>
          <Text style={styles.cardDesc}>These actions are permanent.</Text>
          <Pressable style={styles.dangerBtn} onPress={() => comingSoon("Delete account endpoint then sign out.")}>
            <Text style={styles.dangerBtnText}>Delete account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#070A11" },
  content: { padding: 16, gap: 12 },
  headerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFFFFF26",
    backgroundColor: "#0000004A",
    padding: 14,
  },
  headerRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFFFFF24",
    backgroundColor: "#FFFFFF10",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  kicker: { color: "#FDE68A", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 },
  title: { marginTop: 3, color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
  subtitle: { marginTop: 3, color: "#FFFFFFB0", fontSize: 13, lineHeight: 18 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFFFFF1F",
    backgroundColor: "#FFFFFF0D",
    padding: 12,
    gap: 8,
  },
  cardTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  cardDesc: { color: "#FFFFFFA8", fontSize: 12, marginBottom: 2 },
  fieldLabel: { color: "#FFFFFFC7", fontSize: 12, fontWeight: "600" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF21",
    backgroundColor: "#00000040",
    color: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  smallHelp: { color: "#FFFFFF80", fontSize: 11, lineHeight: 15 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  primaryBtn: {
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryBtnText: { color: "#0B0F18", fontWeight: "700", fontSize: 13 },
  secondaryBtn: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#FFFFFF25",
    backgroundColor: "#FFFFFF12",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryBtnText: { color: "#FFFFFFEB", fontWeight: "600", fontSize: 13 },
  dangerBtn: {
    borderRadius: 11,
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dangerBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  disabled: { opacity: 0.6 },
  toggleRow: {
    borderWidth: 1,
    borderColor: "#FFFFFF1F",
    borderRadius: 12,
    backgroundColor: "#00000035",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  toggleTextWrap: { flex: 1, gap: 2 },
  toggleLabel: { color: "#FFFFFFE8", fontWeight: "600", fontSize: 13 },
  toggleDescription: { color: "#FFFFFF8A", fontSize: 11, lineHeight: 15 },
});
