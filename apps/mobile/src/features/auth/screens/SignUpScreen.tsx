import { useEffect } from "react";
import type { ImageSourcePropType } from "react-native";
import { Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuthFlowContext } from "../AuthFlowContext";
import { AuthLayout } from "../components/AuthLayout";
import { authStyles as styles } from "../styles";
import type { AuthStackParamList } from "../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "SignUp"> & {
  logo: ImageSourcePropType;
};

export function SignUpScreen({ navigation, logo }: Props) {
  const flow = useAuthFlowContext();

  useEffect(() => {
    flow.setAuthMode("signUp");
  }, [flow]);

  async function onSubmit() {
    const result = await flow.handleSignUp();
    if (result === "confirm") {
      navigation.navigate("Confirm");
    } else if (result === "signIn") {
      navigation.navigate("SignIn");
    }
  }

  return (
    <AuthLayout
      logo={logo}
      title="Create account"
      subtitle="Create your account to start building your fragrance identity."
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
      <TextInput
        value={flow.displayName}
        onChangeText={flow.setDisplayName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        placeholder="Display name"
        placeholderTextColor="#7D8594"
        style={styles.input}
      />
      <View style={styles.usernameWrap}>
        <Text style={styles.usernamePrefix}>@</Text>
        <TextInput
          value={flow.usernameRaw}
          onChangeText={flow.setUsernameRaw}
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          placeholder="Username"
          placeholderTextColor="#7D8594"
          style={styles.usernameInput}
        />
      </View>
      <Text style={styles.usernameHelp}>
        {flow.usernameHelp}
        {flow.usernameStatus === "checking" ? " ..." : ""}
      </Text>
      <TextInput
        value={flow.confirmPassword}
        onChangeText={flow.setConfirmPassword}
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        secureTextEntry
        placeholder="Confirm password"
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
        <Text style={styles.primaryButtonText}>{flow.submitting ? "Creating..." : "Create account"}</Text>
      </Pressable>
      <Text style={styles.footerText}>
        Already have an account?{" "}
        <Text
          style={styles.footerLink}
          onPress={() => {
            flow.clearMessages();
            navigation.navigate("SignIn");
          }}
        >
          Sign in
        </Text>
      </Text>
    </AuthLayout>
  );
}
