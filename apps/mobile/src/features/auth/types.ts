export type AuthMode = "signIn" | "signUp" | "confirm";

export type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

export type AuthFlow = {
  mode: AuthMode;
  displayName: string;
  usernameRaw: string;
  usernameHelp: string;
  usernameStatus: UsernameStatus;
  email: string;
  password: string;
  confirmPassword: string;
  confirmationCode: string;
  userLabel: string | null;
  loadingSession: boolean;
  submitting: boolean;
  error: string | null;
  info: string | null;
  setDisplayName: (value: string) => void;
  setUsernameRaw: (value: string) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setConfirmationCode: (value: string) => void;
  setAuthMode: (mode: AuthMode) => void;
  clearMessages: () => void;
  handleSignIn: () => Promise<"signedIn" | "confirm" | "idle">;
  handleSignUp: () => Promise<"confirm" | "signIn" | "idle">;
  handleConfirmSignUp: () => Promise<"signIn" | "idle">;
  handleSignOut: () => Promise<void>;
};
