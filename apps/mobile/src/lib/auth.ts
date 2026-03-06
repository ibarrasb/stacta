import {
  confirmSignUp,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
  type SignInOutput,
  type SignUpOutput,
} from "aws-amplify/auth";

export async function authSignUp(email: string, password: string): Promise<SignUpOutput> {
  return signUp({
    username: email.trim(),
    password,
    options: {
      userAttributes: { email: email.trim() },
    },
  });
}

export async function authConfirmSignUp(email: string, code: string) {
  return confirmSignUp({
    username: email.trim(),
    confirmationCode: code.trim(),
  });
}

export async function authSignIn(email: string, password: string): Promise<SignInOutput> {
  return signIn({
    username: email.trim(),
    password,
  });
}

export async function authSignOut() {
  return signOut();
}

export async function authGetCurrentUser() {
  return getCurrentUser();
}
