import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureAmplify } from "./src/lib/amplify";
import {
  authConfirmSignUp,
  authGetCurrentUser,
  authSignIn,
  authSignOut,
  authSignUp,
} from "./src/lib/auth";
import { checkUsernameAvailable, UsernameCheckError } from "./src/lib/api/usernames";
import stactaLogo from "./assets/stacta.png";

type AuthMode = "signIn" | "signUp" | "confirm";
type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";
const PENDING_DISPLAY_NAME_KEY = "stacta:pendingDisplayName";
const PENDING_USERNAME_KEY = "stacta:pendingUsername";

function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

function isValidUsername(u: string) {
  return /^[a-z0-9][a-z0-9_]{2,19}$/.test(u);
}

function friendlyAuthError(err: unknown) {
  const e = err as { name?: string; message?: string };
  const name = e?.name ?? "";
  const message = e?.message ?? "Something went wrong.";

  if (name === "NotAuthorizedException") return "Wrong email or password.";
  if (name === "UserNotFoundException") return "No account found with that email.";
  if (name === "UsernameExistsException") return "An account with this email already exists.";
  if (name === "CodeMismatchException") return "That confirmation code is invalid.";
  if (name === "ExpiredCodeException") return "That confirmation code is expired. Request a new one.";
  if (name === "TooManyRequestsException") return "Too many attempts. Please try again in a moment.";

  return message;
}

export default function App() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [displayName, setDisplayName] = useState("");
  const [usernameRaw, setUsernameRaw] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameHelp, setUsernameHelp] = useState("3-20 chars. Letters, numbers, underscore.");
  const username = useMemo(() => normalizeUsername(usernameRaw), [usernameRaw]);
  const canSubmitUsername =
    username &&
    isValidUsername(username) &&
    usernameStatus !== "checking" &&
    usernameStatus !== "taken" &&
    usernameStatus !== "invalid" &&
    usernameStatus !== "error";

  const amplifySetup = useMemo(() => configureAmplify(), []);

  useEffect(() => {
    if (!amplifySetup.ok) {
      setLoadingSession(false);
      return;
    }

    let cancelled = false;
    authGetCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setUserLabel(u.signInDetails?.loginId || u.username || "Signed in user");
      })
      .catch(() => {
        if (cancelled) return;
        setUserLabel(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [amplifySetup]);

  useEffect(() => {
    if (mode !== "signUp") return;

    const raw = usernameRaw.trim();
    if (!raw) {
      setUsernameStatus("idle");
      setUsernameHelp("3-20 chars. Letters, numbers, underscore.");
      return;
    }

    if (!username || !isValidUsername(username)) {
      setUsernameStatus("invalid");
      setUsernameHelp(
        username
          ? "Username is invalid. Use 3-20 chars: letters/numbers/underscore."
          : "Username is required."
      );
      return;
    }

    const ctrl = new AbortController();
    setUsernameStatus("checking");
    setUsernameHelp("Checking availability...");

    const timeoutId = setTimeout(async () => {
      try {
        const data = await checkUsernameAvailable(username, ctrl.signal);
        if (data.available) {
          setUsernameStatus("available");
          setUsernameHelp(`@${data.normalized} is available`);
        } else {
          setUsernameStatus("taken");
          setUsernameHelp(`@${data.normalized} is taken`);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        if (err instanceof UsernameCheckError && err.status === 400) {
          setUsernameStatus("invalid");
          setUsernameHelp("Username is invalid. Use 3-20 chars: letters/numbers/underscore.");
          return;
        }
        setUsernameStatus("error");
        setUsernameHelp("Couldn't check username. Confirm API is running and EXPO_PUBLIC_API_URL is correct.");
      }
    }, 450);

    return () => {
      ctrl.abort();
      clearTimeout(timeoutId);
    };
  }, [mode, username, usernameRaw]);

  async function handleSignIn() {
    setError(null);
    setInfo(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await authSignIn(trimmedEmail, password);
      if (result.isSignedIn) {
        setUserLabel(trimmedEmail);
        return;
      }

      if (result.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        setMode("confirm");
        setInfo("Confirm your email to finish sign in.");
      } else {
        setError(`Additional step required: ${result.nextStep?.signInStep ?? "UNKNOWN"}`);
      }
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "UserNotConfirmedException") {
        setMode("confirm");
        setInfo("Enter the email confirmation code we sent you.");
      } else {
        setError(friendlyAuthError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp() {
    setError(null);
    setInfo(null);

    const dn = displayName.trim();
    const un = normalizeUsername(usernameRaw);
    const trimmedEmail = email.trim();
    if (!dn) {
      setError("Display name is required.");
      return;
    }
    if (!un) {
      setError("Username is required.");
      return;
    }
    if (!isValidUsername(un)) {
      setError("Username must be 3-20 characters and use only letters, numbers, or underscores.");
      return;
    }
    if (!canSubmitUsername) {
      if (usernameStatus === "checking") setError("Hold up - still checking that username.");
      else if (usernameStatus === "taken") setError("That username is taken. Pick another one.");
      else setError("Fix your username before continuing.");
      return;
    }
    if (!trimmedEmail || !password || !confirmPassword) {
      setError("Display name, username, email, password, and confirm password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await authSignUp(trimmedEmail, password);
      await AsyncStorage.setItem(PENDING_DISPLAY_NAME_KEY, dn);
      await AsyncStorage.setItem(PENDING_USERNAME_KEY, un);
      if (result.nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setMode("confirm");
        setInfo("Account created. Enter the confirmation code from your email.");
      } else {
        setMode("signIn");
        setInfo("Account created. Sign in now.");
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmSignUp() {
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim();
    const trimmedCode = confirmationCode.trim();

    if (!trimmedEmail || !trimmedCode) {
      setError("Email and confirmation code are required.");
      return;
    }

    setSubmitting(true);
    try {
      await authConfirmSignUp(trimmedEmail, trimmedCode);
      setMode("signIn");
      setConfirmationCode("");
      setInfo("Email confirmed. Sign in with your password.");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      await authSignOut();
      setUserLabel(null);
      setPassword("");
      setConfirmPassword("");
      setConfirmationCode("");
      setMode("signIn");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!amplifySetup.ok) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <View style={styles.brandHeader}>
            <Image source={stactaLogo} style={styles.brandLogoLarge} resizeMode="contain" />
            <Text style={styles.brandTextLarge}>Stacta</Text>
          </View>
          <Text style={styles.title}>Missing Auth Config</Text>
          <Text style={styles.subtitle}>
            Add these env vars in `apps/mobile/.env` and restart Metro:
          </Text>
          {amplifySetup.missingVars.map((v) => (
            <Text key={v} style={styles.codeLine}>
              {v}
            </Text>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (loadingSession) {
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

  if (userLabel) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <View style={styles.brandHeader}>
            <Image source={stactaLogo} style={styles.brandLogoLarge} resizeMode="contain" />
            <Text style={styles.brandTextLarge}>Stacta</Text>
          </View>
          <Text style={styles.title}>You are signed in</Text>
          <Text style={styles.subtitle}>{userLabel}</Text>
          <Pressable
            style={[styles.primaryButton, submitting && styles.disabledButton]}
            onPress={handleSignOut}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? "Signing out..." : "Sign out"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandHeader}>
            <Image source={stactaLogo} style={styles.brandLogoLarge} resizeMode="contain" />
            <Text style={styles.brandTextLarge}>Stacta</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>
              {mode === "signUp" ? "Create account" : mode === "confirm" ? "Confirm your email" : "Welcome back"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "signUp"
                ? "Create your account to start building your fragrance identity."
                : mode === "confirm"
                  ? "Enter the code we sent to your email."
                  : "Sign in to continue building your fragrance identity."}
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="Email"
              placeholderTextColor="#7D8594"
              style={styles.input}
            />

            {(mode === "signIn" || mode === "signUp") && (
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                secureTextEntry
                placeholder="Password"
                placeholderTextColor="#7D8594"
                style={styles.input}
              />
            )}

            {mode === "signUp" && (
              <>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
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
                    value={usernameRaw}
                    onChangeText={setUsernameRaw}
                    autoCapitalize="none"
                    autoComplete="username"
                    textContentType="username"
                    placeholder="Username"
                    placeholderTextColor="#7D8594"
                    style={styles.usernameInput}
                  />
                </View>
                <Text style={styles.usernameHelp}>
                  {usernameHelp}
                  {usernameStatus === "checking" ? " ..." : ""}
                </Text>
              </>
            )}

            {mode === "signUp" && (
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                secureTextEntry
                placeholder="Confirm password"
                placeholderTextColor="#7D8594"
                style={styles.input}
              />
            )}

            {mode === "confirm" && (
              <TextInput
                value={confirmationCode}
                onChangeText={setConfirmationCode}
                autoCapitalize="none"
                keyboardType="number-pad"
                placeholder="Confirmation code"
                placeholderTextColor="#7D8594"
                style={styles.input}
              />
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {info ? <Text style={styles.infoText}>{info}</Text> : null}

            {mode === "signIn" && (
              <>
                <Pressable
                  style={[styles.primaryButton, submitting && styles.disabledButton]}
                  onPress={handleSignIn}
                  disabled={submitting}
                >
                  <Text style={styles.primaryButtonText}>
                    {submitting ? "Signing in..." : "Sign in"}
                  </Text>
                </Pressable>
                <Text style={styles.footerText}>
                  New user?{" "}
                  <Text
                    style={styles.footerLink}
                    onPress={() => {
                      setMode("signUp");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Sign up
                  </Text>
                </Text>
              </>
            )}

            {mode === "signUp" && (
              <>
                <Pressable
                  style={[styles.primaryButton, submitting && styles.disabledButton]}
                  onPress={handleSignUp}
                  disabled={submitting}
                >
                  <Text style={styles.primaryButtonText}>
                    {submitting ? "Creating..." : "Create account"}
                  </Text>
                </Pressable>
                <Text style={styles.footerText}>
                  Already have an account?{" "}
                  <Text
                    style={styles.footerLink}
                    onPress={() => {
                      setMode("signIn");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Sign in
                  </Text>
                </Text>
              </>
            )}

            {mode === "confirm" && (
              <>
                <Pressable
                  style={[styles.primaryButton, submitting && styles.disabledButton]}
                  onPress={handleConfirmSignUp}
                  disabled={submitting}
                >
                  <Text style={styles.primaryButtonText}>
                    {submitting ? "Confirming..." : "Confirm email"}
                  </Text>
                </Pressable>
                <Text style={styles.footerText}>
                  Back to{" "}
                  <Text
                    style={styles.footerLink}
                    onPress={() => {
                      setMode("signIn");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Sign in
                  </Text>
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  loaderText: {
    color: "#D1D5DB",
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ffffff24",
    backgroundColor: "#00000077",
    borderRadius: 26,
    padding: 22,
    gap: 12,
    zIndex: 1,
  },
  brandHeader: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderColor: "#ffffff26",
    backgroundColor: "#00000044",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  brandLogoLarge: {
    width: 72,
    height: 72,
    borderRadius: 14,
    marginBottom: 8,
  },
  brandTextLarge: {
    color: "#FFFFFFE0",
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.8,
  },
  brandLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  brandText: {
    color: "#FFFFFFCC",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: "#FFFFFFA3",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  codeLine: {
    color: "#A7F3D0",
    fontSize: 13,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ffffff22",
    borderRadius: 13,
    backgroundColor: "#0000004f",
    color: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  usernameWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff22",
    borderRadius: 13,
    backgroundColor: "#0000004f",
    paddingHorizontal: 14,
  },
  usernamePrefix: {
    color: "#FFFFFF80",
    fontSize: 16,
    marginRight: 2,
  },
  usernameInput: {
    flex: 1,
    color: "#F8FAFC",
    paddingVertical: 13,
    fontSize: 16,
  },
  usernameHelp: {
    color: "#FFFFFF90",
    fontSize: 12,
    marginTop: -4,
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#0B0F18",
    fontSize: 15,
    fontWeight: "700",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    marginTop: 2,
  },
  infoText: {
    color: "#A7F3D0",
    fontSize: 13,
    marginTop: 2,
  },
  footerText: {
    marginTop: 4,
    color: "#FFFFFFA3",
    fontSize: 13,
    textAlign: "center",
  },
  footerLink: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
