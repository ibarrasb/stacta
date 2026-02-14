import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
} from "aws-amplify/auth";

// SIGN UP (Cognito sends the confirmation code email if verification is enabled)
export async function authSignUp(email: string, password: string) {
  return signUp({
    username: email,
    password,
    options: {
      userAttributes: { email },
    },
  });
}

// CONFIRM SIGN UP (user enters the code they got via email)
export async function authConfirmSignUp(email: string, code: string) {
  return confirmSignUp({ username: email, confirmationCode: code });
}

// LOGIN
export async function authSignIn(email: string, password: string) {
  const username = email.trim();

  // helper to create an Error that matches your existing SignInPage checks
  const namedError = (name: string, message: string, extra?: Record<string, any>) => {
    const err: any = new Error(message);
    err.name = name;
    if (extra) Object.assign(err, extra);
    throw err;
  };

  const doSignIn = async () => {
    const res = await signIn({ username, password });

    // Amplify v6: signIn may return nextStep instead of throwing
    if (!res.isSignedIn) {
      const step = res.nextStep?.signInStep;

      // This is the one you care about — send them to confirm screen
      if (step === "CONFIRM_SIGN_UP") {
        namedError("UserNotConfirmedException", "User is not confirmed.");
      }

      // Any other step => surface it (rare, but better than silently continuing)
      namedError("AuthNextStep", `Sign in requires additional step: ${step ?? "UNKNOWN"}`, {
        step,
      });
    }

    return res;
  };

  try {
    return await doSignIn();
  } catch (err: any) {
    const msg = String(err?.message || "");
    const name = err?.name || err?.code;

    // Common dev-time edge case: session exists already
    if (
      name === "UserAlreadyAuthenticatedException" ||
      msg.toLowerCase().includes("already a signed in user")
    ) {
      await signOut().catch(() => null);
      return await doSignIn();
    }

    // Otherwise, propagate original error
    throw err;
  }
}

// LOGOUT
export async function authSignOut() {
  return signOut();
}

// FORGOT PASSWORD (sends reset code)
export async function authForgotPassword(email: string) {
  return resetPassword({ username: email.trim() });
}

// CONFIRM FORGOT PASSWORD (code + new password)
export async function authConfirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
) {
  return confirmResetPassword({
    username: email.trim(),
    confirmationCode: code.trim(),
    newPassword,
  });
}

// TOKEN for calling your backend
export async function getAccessToken(): Promise<string | null> {
  const session = await fetchAuthSession({ forceRefresh: false });
  const token = session.tokens?.accessToken?.toString() ?? null;
  if (token) return token;

  const refreshed = await fetchAuthSession({ forceRefresh: true });
  return refreshed.tokens?.accessToken?.toString() ?? null;
}


// Cognito user id (sub)
export async function getUserSub(): Promise<string | null> {
  const user = await getCurrentUser().catch(() => null);
  return user?.userId ?? null;
}

export async function authResendSignUpCode(email: string) {
  return resendSignUpCode({ username: email.trim() });
}
