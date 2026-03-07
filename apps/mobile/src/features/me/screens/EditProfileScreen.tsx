import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { getMe, updateMe } from "../../../lib/api/me";
import { uploadImageFromDevice } from "../../../lib/api/uploads";
import type { MeResponse } from "../../../lib/api/types";
import stactaLogo from "../../../../assets/stacta.png";

type EditProfileScreenProps = {
  onBack: () => void;
};

export function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarObjectKey, setAvatarObjectKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getMe();
        if (cancelled) return;
        setMe(data);
        setDisplayName(data.displayName ?? "");
        setBio(data.bio ?? "");
        setAvatarUri(data.avatarUrl ?? null);
        setAvatarObjectKey(data.avatarObjectKey ?? null);
      } catch (err) {
        if (cancelled) return;
        Alert.alert("Edit Profile", (err as { message?: string })?.message || "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = useMemo(() => {
    const clean = displayName.trim();
    if (!clean) return "S";
    const parts = clean.split(/\s+/).slice(0, 2);
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase() || "S";
  }, [displayName]);

  async function onPickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission", "Photo library permission is required to change profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];

    try {
      const uploaded = await uploadImageFromDevice({
        uri: asset.uri,
        fileName: asset.fileName ?? "profile.jpg",
        mimeType: asset.mimeType ?? "image/jpeg",
        uploadKind: "PROFILE",
      });
      setAvatarUri(uploaded.publicUrl ?? asset.uri);
      setAvatarObjectKey(uploaded.objectKey);
    } catch (err) {
      Alert.alert("Upload failed", (err as { message?: string })?.message || "Could not upload image.");
    }
  }

  async function onSave() {
    if (!me || saving) return;
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      Alert.alert("Edit Profile", "Display name is required.");
      return;
    }

    setSaving(true);
    try {
      await updateMe({
        displayName: nextDisplayName,
        bio: bio.trim() ? bio.trim() : null,
        avatarObjectKey,
        isPrivate: me.isPrivate,
      });
      onBack();
    } catch (err) {
      Alert.alert("Save failed", (err as { message?: string })?.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable style={styles.topAction} onPress={onBack} disabled={saving}>
            <Text style={styles.topActionText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Edit profile</Text>
          <Pressable style={styles.topAction} onPress={onSave} disabled={saving || loading}>
            <Text style={[styles.topActionText, styles.doneText]}>{saving ? "Saving..." : "Done"}</Text>
          </Pressable>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarFallbackText}>{initials}</Text>
              </View>
            )}
            <Pressable style={styles.cameraBadge} onPress={onPickPhoto} disabled={saving || loading}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </Pressable>
          </View>
          <Pressable onPress={onPickPhoto} disabled={saving || loading}>
            <Text style={styles.changePhotoText}>Change profile photo</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
            placeholder="Display name"
            placeholderTextColor="#FFFFFF66"
            maxLength={120}
            editable={!saving && !loading}
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            style={[styles.input, styles.bioInput]}
            placeholder="Bio"
            placeholderTextColor="#FFFFFF66"
            maxLength={500}
            editable={!saving && !loading}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#070A11" },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, gap: 18 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topAction: { minWidth: 56 },
  topActionText: { color: "#FFFFFFCC", fontSize: 16 },
  doneText: { color: "#3797EF", fontWeight: "700", textAlign: "right" },
  title: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  avatarSection: { alignItems: "center", gap: 10, marginTop: 8 },
  avatarWrap: { position: "relative" },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: "#FFFFFF1A" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarFallbackText: { color: "#FFFFFF", fontSize: 28, fontWeight: "700" },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3797EF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#070A11",
  },
  changePhotoText: { color: "#3797EF", fontSize: 14, fontWeight: "600" },
  form: { gap: 10 },
  label: { color: "#FFFFFFCC", fontSize: 13, fontWeight: "600" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF22",
    backgroundColor: "#FFFFFF10",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 15,
  },
  bioInput: { minHeight: 120 },
});
