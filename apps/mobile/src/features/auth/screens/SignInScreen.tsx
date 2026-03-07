import { useEffect } from "react";
import type { ImageSourcePropType } from "react-native";
import { Pressable, Text, TextInput } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuthFlowContext } from "../AuthFlowContext";
import { AuthLayout } from "../components/AuthLayout";
import { authStyles as styles } from "../styles";
import type { AuthStackParamList } from "../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "SignIn"> & {
  logo: ImageSourcePropType;
};

export function SignInScreen({ navigation, logo }: Props) {
  const flow = useAuthFlowContext();

  useEffect(() => {
    flow.setAuthMode("signIn");
  }, [flow]);

  async function onSubmit() {
    const result = await flow.handleSignIn();
    if (result === "confirm") {
      navigation.navigate("Confirm");
    }
  }

  return (
    <AuthLayout
      logo={logo}
      title="Welcome back"
      subtitle="Sign in to continue building your fragrance identity."
    >
      <TextInput
        value={flow.email}
        onChangeText={flow.setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="Email"
        placeholderTextColor="#7D8594"
        style={styles.input}
      />
      <TextInput
        value={flow.password}
        onChangeText={flow.setPassword}
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        secureTextEntry
        placeholder="Password"
        placeholderTextColor="#7D8594"
        style={styles.input}
      />
      {flow.error ? <Text style={styles.errorText}>{flow.error}</Text> : null}
      {flow.info ? <Text style={styles.infoText}>{flow.info}</Text> : null}
      <Pressable
        style={[styles.primaryButton, flow.submitting && styles.disabledButton]}
        onPress={onSubmit}
        disabled={flow.submitting}
      >
        <Text style={styles.primaryButtonText}>{flow.submitting ? "Signing in..." : "Sign in"}</Text>
      </Pressable>
      <Text style={styles.footerText}>
        New user?{" "}
        <Text
          style={styles.footerLink}
          onPress={() => {
            flow.clearMessages();
            navigation.navigate("SignUp");
          }}
        >
          Sign up
        </Text>
      </Text>
    </AuthLayout>
  );
}
