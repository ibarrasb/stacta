import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { MeStackNavigator } from "../../me/navigation/MeStackNavigator";

type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  People: undefined;
  Alerts: undefined;
  Me: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#070A11",
    card: "#070A11",
  },
};

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#070A11", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: "#F8FAFC", fontSize: 24, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: "#FFFFFFA3", marginTop: 8, textAlign: "center" }}>
        {title} screen is connected to the mobile tab shell.
      </Text>
    </View>
  );
}

type MainTabNavigatorProps = {
  userLabel: string;
  submitting: boolean;
  onSignOut: () => Promise<void>;
};

export function MainTabNavigator({ userLabel, submitting, onSignOut }: MainTabNavigatorProps) {
  const iconNameByRoute: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
    Home: "home-outline",
    Search: "search-outline",
    People: "people-outline",
    Alerts: "notifications-outline",
    Me: "person-outline",
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#FCD34D",
          tabBarInactiveTintColor: "#FFFFFFA3",
          tabBarIcon: ({ color, size, focused }) => {
            const base = iconNameByRoute[route.name as keyof MainTabParamList];
            const activeName =
              base === "home-outline"
                ? "home"
                : base === "search-outline"
                  ? "search"
                  : base === "people-outline"
                    ? "people"
                    : base === "notifications-outline"
                      ? "notifications"
                      : "person";
            return <Ionicons name={focused ? activeName : base} size={size} color={color} />;
          },
          tabBarStyle: {
            backgroundColor: "#0B0F18",
            borderTopWidth: 0,
            borderTopColor: "transparent",
            elevation: 0,
            shadowOpacity: 0,
          },
        })}
      >
        <Tab.Screen name="Home">{() => <PlaceholderScreen title="Home" />}</Tab.Screen>
        <Tab.Screen name="Search">{() => <PlaceholderScreen title="Search" />}</Tab.Screen>
        <Tab.Screen name="People">{() => <PlaceholderScreen title="People" />}</Tab.Screen>
        <Tab.Screen name="Alerts">{() => <PlaceholderScreen title="Alerts" />}</Tab.Screen>
        <Tab.Screen name="Me">
          {() => (
            <MeStackNavigator
              userLabel={userLabel}
              submitting={submitting}
              onSignOut={onSignOut}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
