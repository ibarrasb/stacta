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
    return signIn({ username: email, password });
  }
  
  // LOGOUT
  export async function authSignOut() {
    return signOut();
  }
  
  // FORGOT PASSWORD (sends reset code)
  export async function authForgotPassword(email: string) {
    return resetPassword({ username: email });
  }
  
  // CONFIRM FORGOT PASSWORD (code + new password)
  export async function authConfirmForgotPassword(
    email: string,
    code: string,
    newPassword: string
  ) {
    return confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword,
    });
  }
  
  // TOKEN for calling your backend
  export async function getAccessToken(): Promise<string | null> {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() ?? null;
  }
  
  // Cognito user id (sub)
  export async function getUserSub(): Promise<string | null> {
    const user = await getCurrentUser().catch(() => null);
    return user?.userId ?? null;
  }

  export async function authResendSignUpCode(email: string) {
    return resendSignUpCode({ username: email });
  }
  