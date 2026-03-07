import { useMemo } from "react";
import { configureAmplify } from "./src/lib/amplify";
import stactaLogo from "./assets/stacta.png";
import { MainTabNavigator } from "./src/features/app/navigation/MainTabNavigator";
import { AuthFlowProvider } from "./src/features/auth/AuthFlowContext";
import { AuthNavigator } from "./src/features/auth/navigation/AuthNavigator";
import { useAuthFlow } from "./src/features/auth/useAuthFlow";
import {
  LoadingSessionScreen,
  MissingAuthConfigScreen,
} from "./src/features/auth/components/AuthScreens";

export default function App() {
  const amplifySetup = useMemo(() => configureAmplify(), []);
  const flow = useAuthFlow({ authEnabled: amplifySetup.ok });

  if (!amplifySetup.ok) {
    return <MissingAuthConfigScreen logo={stactaLogo} missingVars={amplifySetup.missingVars} />;
  }

  if (flow.loadingSession) {
    return <LoadingSessionScreen />;
  }

  if (flow.userLabel) {
    return (
      <MainTabNavigator
        userLabel={flow.userLabel}
        submitting={flow.submitting}
        onSignOut={flow.handleSignOut}
      />
    );
  }

  return (
    <AuthFlowProvider flow={flow}>
      <AuthNavigator logo={stactaLogo} />
    </AuthFlowProvider>
  );
}
