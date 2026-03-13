import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
    return (
      <GestureHandlerRootView style={styles.root}>
        <MissingAuthConfigScreen logo={stactaLogo} missingVars={amplifySetup.missingVars} />
      </GestureHandlerRootView>
    );
  }

  if (flow.loadingSession) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <LoadingSessionScreen />
      </GestureHandlerRootView>
    );
  }

  if (flow.userLabel) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <MainTabNavigator
          userLabel={flow.userLabel}
          submitting={flow.submitting}
          onSignOut={flow.handleSignOut}
        />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthFlowProvider flow={flow}>
        <AuthNavigator logo={stactaLogo} />
      </AuthFlowProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
