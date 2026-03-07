export const PENDING_DISPLAY_NAME_KEY = "stacta:pendingDisplayName";
export const PENDING_USERNAME_KEY = "stacta:pendingUsername";
export const DEFAULT_USERNAME_HELP = "3-20 chars. Letters, numbers, underscore.";

export function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

export function isValidUsername(username: string) {
  return /^[a-z0-9][a-z0-9_]{2,19}$/.test(username);
}

export function friendlyAuthError(err: unknown) {
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
