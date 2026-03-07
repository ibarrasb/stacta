import { act, renderHook, waitFor } from "@testing-library/react-native";

jest.mock("../../../lib/auth", () => ({
  authConfirmSignUp: jest.fn(),
  authGetCurrentUser: jest.fn(),
  authSignIn: jest.fn(),
  authSignOut: jest.fn(),
  authSignUp: jest.fn(),
}));
jest.mock("../../../lib/api/usernames", () => ({
  checkUsernameAvailable: jest.fn(),
}));
jest.mock("../../../lib/api/client", () => ({
  clearApiSessionCache: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
}));

const { useAuthFlow } = require("../useAuthFlow") as typeof import("../useAuthFlow");
const {
  authConfirmSignUp,
  authGetCurrentUser,
  authSignIn,
  authSignOut,
  authSignUp,
} = require("../../../lib/auth") as typeof import("../../../lib/auth");
const { checkUsernameAvailable } = require("../../../lib/api/usernames") as typeof import("../../../lib/api/usernames");
const AsyncStorageModule = require("@react-native-async-storage/async-storage") as { setItem: jest.Mock };

const authSignInMock = authSignIn as jest.MockedFunction<typeof authSignIn>;
const authSignUpMock = authSignUp as jest.MockedFunction<typeof authSignUp>;
const authConfirmSignUpMock = authConfirmSignUp as jest.MockedFunction<typeof authConfirmSignUp>;
const authGetCurrentUserMock = authGetCurrentUser as jest.MockedFunction<typeof authGetCurrentUser>;
const authSignOutMock = authSignOut as jest.MockedFunction<typeof authSignOut>;
const checkUsernameAvailableMock = checkUsernameAvailable as jest.MockedFunction<typeof checkUsernameAvailable>;
const setItemMock = AsyncStorageModule.setItem;

describe("useAuthFlow", () => {
  beforeEach(() => {
    jest.useRealTimers();
    authGetCurrentUserMock.mockRejectedValue(new Error("no session"));
    authSignInMock.mockReset();
    authSignUpMock.mockReset();
    authConfirmSignUpMock.mockReset();
    authSignOutMock.mockReset();
    checkUsernameAvailableMock.mockReset();
    setItemMock.mockReset();
  });

  it("returns confirm for sign-in flows that require confirmation", async () => {
    authSignInMock.mockResolvedValue({
      isSignedIn: false,
      nextStep: { signInStep: "CONFIRM_SIGN_UP" },
    } as Awaited<ReturnType<typeof authSignIn>>);

    const { result } = renderHook(() => useAuthFlow({ authEnabled: true }));
    await waitFor(() => expect(result.current.loadingSession).toBe(false));

    act(() => {
      result.current.setEmail("user@example.com");
      result.current.setPassword("password123");
    });

    let outcome: Awaited<ReturnType<typeof result.current.handleSignIn>> | undefined;
    await act(async () => {
      outcome = await result.current.handleSignIn();
    });

    expect(outcome).toBe("confirm");
    expect(result.current.mode).toBe("confirm");
    expect(result.current.info).toBe("Confirm your email to finish sign in.");
  });

  it("validates sign-up username before calling auth", async () => {
    const { result } = renderHook(() => useAuthFlow({ authEnabled: false }));

    act(() => {
      result.current.setAuthMode("signUp");
      result.current.setEmail("user@example.com");
      result.current.setPassword("password123");
      result.current.setConfirmPassword("password123");
      result.current.setDisplayName("User");
      result.current.setUsernameRaw("ab");
    });

    let outcome: Awaited<ReturnType<typeof result.current.handleSignUp>> | undefined;
    await act(async () => {
      outcome = await result.current.handleSignUp();
    });

    expect(outcome).toBe("idle");
    expect(authSignUpMock).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      "Username must be 3-20 characters and use only letters, numbers, or underscores."
    );
  });

  it("checks username availability in sign-up mode after debounce", async () => {
    jest.useFakeTimers();
    checkUsernameAvailableMock.mockResolvedValue({
      available: true,
      normalized: "valid_user",
      reason: "AVAILABLE",
    });

    const { result } = renderHook(() => useAuthFlow({ authEnabled: false }));

    act(() => {
      result.current.setAuthMode("signUp");
      result.current.setUsernameRaw("valid_user");
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current.usernameStatus).toBe("available"));
    expect(checkUsernameAvailableMock).toHaveBeenCalledWith("valid_user", expect.any(AbortSignal));
    expect(result.current.usernameHelp).toBe("@valid_user is available");
  });
});
