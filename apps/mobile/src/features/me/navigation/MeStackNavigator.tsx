import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MeScreen } from "../screens/MeScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";

type MeStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<MeStackParamList>();

type MeStackNavigatorProps = {
  userLabel: string;
  submitting: boolean;
  onSignOut: () => Promise<void>;
};

export function MeStackNavigator({ userLabel, submitting, onSignOut }: MeStackNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile">
        {(props) => (
          <MeScreen
            userLabel={userLabel}
            onOpenSettings={() => props.navigation.navigate("Settings")}
            onOpenEditProfile={() => props.navigation.navigate("EditProfile")}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="EditProfile">
        {(props) => <EditProfileScreen onBack={props.navigation.goBack} />}
      </Stack.Screen>
      <Stack.Screen name="Settings">
        {(props) => (
          <SettingsScreen
            onBack={props.navigation.goBack}
            onSignOut={onSignOut}
            submitting={submitting}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
