import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { FollowRequestsScreen } from "../screens/FollowRequestsScreen";

export type AlertsStackParamList = {
  Notifications: undefined;
  FollowRequests: undefined;
};

const Stack = createNativeStackNavigator<AlertsStackParamList>();

export function AlertsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="FollowRequests" component={FollowRequestsScreen} />
    </Stack.Navigator>
  );
}
