import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authConfirmSignUp,
  authGetCurrentUser,
  authSignIn,
  authSignOut,
  authSignUp,
} from "../../lib/auth";
import { checkUsernameAvailable, UsernameCheckError } from "../../lib/api/usernames";
import { clearApiSessionCache } from "../../lib/api/client";
import type { AuthFlow, AuthMode, UsernameStatus } from "./types";
import {
  DEFAULT_USERNAME_HELP,
  PENDING_DISPLAY_NAME_KEY,
  PENDING_USERNAME_KEY,
  friendlyAuthError,
  isValidUsername,
  normalizeUsername,
} from "./utils";

type UseAuthFlowParams = {
  authEnabled: boolean;
};

export function useAuthFlow({ authEnabled }: UseAuthFlowParams): AuthFlow {
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
  const [usernameHelp, setUsernameHelp] = useState(DEFAULT_USERNAME_HELP);
  const username = useMemo(() => normalizeUsername(usernameRaw), [usernameRaw]);
  const canSubmitUsername =
    username &&
    isValidUsername(username) &&
    usernameStatus !== "checking" &&
    usernameStatus !== "taken" &&
    usernameStatus !== "invalid" &&
    usernameStatus !== "error";

  useEffect(() => {
    if (!authEnabled) {
      setLoadingSession(false);
      return;
    }

    let cancelled = false;
    authGetCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setUserLabel(user.signInDetails?.loginId || user.username || "Signed in user");
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
  }, [authEnabled]);

  useEffect(() => {
    if (mode !== "signUp") return;

    const raw = usernameRaw.trim();
    if (!raw) {
      setUsernameStatus("idle");
      setUsernameHelp(DEFAULT_USERNAME_HELP);
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

  const setAuthMode = (nextMode: AuthMode) => {
    setMode(nextMode);
  };

  const clearMessages = () => {
    setError(null);
    setInfo(null);
  };

  async function handleSignIn(): Promise<"signedIn" | "confirm" | "idle"> {
    clearMessages();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return "idle";
    }

    setSubmitting(true);
    try {
      const result = await authSignIn(trimmedEmail, password);
      if (result.isSignedIn) {
        setUserLabel(trimmedEmail);
        return "signedIn";
      }

      if (result.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        setMode("confirm");
        setInfo("Confirm your email to finish sign in.");
        return "confirm";
      } else {
        setError(`Additional step required: ${result.nextStep?.signInStep ?? "UNKNOWN"}`);
      }
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "UserNotConfirmedException") {
        setMode("confirm");
        setInfo("Enter the email confirmation code we sent you.");
        return "confirm";
      } else {
        setError(friendlyAuthError(err));
      }
    } finally {
      setSubmitting(false);
    }

    return "idle";
  }

  async function handleSignUp(): Promise<"confirm" | "signIn" | "idle"> {
    clearMessages();

    const trimmedDisplayName = displayName.trim();
    const normalizedUsername = normalizeUsername(usernameRaw);
    const trimmedEmail = email.trim();
    if (!trimmedDisplayName) {
      setError("Display name is required.");
      return "idle";
    }
    if (!normalizedUsername) {
      setError("Username is required.");
      return "idle";
    }
    if (!isValidUsername(normalizedUsername)) {
      setError("Username must be 3-20 characters and use only letters, numbers, or underscores.");
      return "idle";
    }
    if (!canSubmitUsername) {
      if (usernameStatus === "checking") setError("Hold up - still checking that username.");
      else if (usernameStatus === "taken") setError("That username is taken. Pick another one.");
      else setError("Fix your username before continuing.");
      return "idle";
    }
    if (!trimmedEmail || !password || !confirmPassword) {
      setError("Display name, username, email, password, and confirm password are required.");
      return "idle";
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return "idle";
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return "idle";
    }

    setSubmitting(true);
    try {
      const result = await authSignUp(trimmedEmail, password);
      await AsyncStorage.setItem(PENDING_DISPLAY_NAME_KEY, trimmedDisplayName);
      await AsyncStorage.setItem(PENDING_USERNAME_KEY, normalizedUsername);
      if (result.nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setMode("confirm");
        setInfo("Account created. Enter the confirmation code from your email.");
        return "confirm";
      } else {
        setMode("signIn");
        setInfo("Account created. Sign in now.");
        return "signIn";
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }

    return "idle";
  }

  async function handleConfirmSignUp(): Promise<"signIn" | "idle"> {
    clearMessages();
    const trimmedEmail = email.trim();
    const trimmedCode = confirmationCode.trim();

    if (!trimmedEmail || !trimmedCode) {
      setError("Email and confirmation code are required.");
      return "idle";
    }

    setSubmitting(true);
    try {
      await authConfirmSignUp(trimmedEmail, trimmedCode);
      setMode("signIn");
      setPassword("");
      setConfirmPassword("");
      setConfirmationCode("");
      setInfo("Email confirmed. Sign in with your password.");
      return "signIn";
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }

    return "idle";
  }

  async function handleSignOut() {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      await authSignOut();
      clearApiSessionCache();
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

  return {
    mode,
    displayName,
    usernameRaw,
    usernameHelp,
    usernameStatus,
    email,
    password,
    confirmPassword,
    confirmationCode,
    userLabel,
    loadingSession,
    submitting,
    error,
    info,
    setDisplayName,
    setUsernameRaw,
    setEmail,
    setPassword,
    setConfirmPassword,
    setConfirmationCode,
    setAuthMode,
    clearMessages,
    handleSignIn,
    handleSignUp,
    handleConfirmSignUp,
    handleSignOut,
  };
}
