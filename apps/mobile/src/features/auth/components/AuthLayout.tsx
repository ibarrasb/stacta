import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import type { ImageSourcePropType } from "react-native";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "./AuthScreens";
import { authStyles as styles } from "../styles";

type AuthLayoutProps = {
  logo: ImageSourcePropType;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthLayout({ logo, title, subtitle, children }: AuthLayoutProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <BrandHeader logo={logo} />
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
