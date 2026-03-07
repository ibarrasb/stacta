import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { AuthFlow } from "./types";

const AuthFlowContext = createContext<AuthFlow | null>(null);

type AuthFlowProviderProps = {
  flow: AuthFlow;
  children: ReactNode;
};

export function AuthFlowProvider({ flow, children }: AuthFlowProviderProps) {
  return <AuthFlowContext.Provider value={flow}>{children}</AuthFlowContext.Provider>;
}

export function useAuthFlowContext() {
  const context = useContext(AuthFlowContext);
  if (!context) {
    throw new Error("useAuthFlowContext must be used inside AuthFlowProvider");
  }
  return context;
}
