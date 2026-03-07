import { StatusBar } from "expo-status-bar";
import type { ImageSourcePropType } from "react-native";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authStyles as styles } from "../styles";

type BrandHeaderProps = {
  logo: ImageSourcePropType;
};

export function BrandHeader({ logo }: BrandHeaderProps) {
  return (
    <View style={styles.brandHeader}>
      <Image source={logo} style={styles.brandLogoLarge} resizeMode="contain" />
      <Text style={styles.brandTextLarge}>Stacta</Text>
    </View>
  );
}

type MissingAuthConfigScreenProps = {
  logo: ImageSourcePropType;
  missingVars: string[];
};

export function MissingAuthConfigScreen({ logo, missingVars }: MissingAuthConfigScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <BrandHeader logo={logo} />
        <Text style={styles.title}>Missing Auth Config</Text>
        <Text style={styles.subtitle}>Add these env vars in `apps/mobile/.env` and restart Metro:</Text>
        {missingVars.map((v) => (
          <Text key={v} style={styles.codeLine}>
            {v}
          </Text>
        ))}
      </View>
    </SafeAreaView>
  );
}

export function LoadingSessionScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.loaderWrap}>
        <ActivityIndicator color="#6EE7B7" />
        <Text style={styles.loaderText}>Checking session...</Text>
      </View>
    </SafeAreaView>
  );
}

type SignedInScreenProps = {
  logo: ImageSourcePropType;
  userLabel: string;
  submitting: boolean;
  onSignOut: () => Promise<void>;
};

export function SignedInScreen({ logo, userLabel, submitting, onSignOut }: SignedInScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <BrandHeader logo={logo} />
        <Text style={styles.title}>You are signed in</Text>
        <Text style={styles.subtitle}>{userLabel}</Text>
        <Pressable
          style={[styles.primaryButton, submitting && styles.disabledButton]}
          onPress={onSignOut}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>{submitting ? "Signing out..." : "Sign out"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
