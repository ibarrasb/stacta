import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import * as SvgLib from "react-native-svg";
import { useFonts, BungeeHairline_400Regular } from "@expo-google-fonts/bungee-hairline";
import { MeStackNavigator } from "../../me/navigation/MeStackNavigator";
import stactaLogo from "../../../../assets/stacta.png";

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
  const [fontLoaded] = useFonts({ BungeeHairline_400Regular });
  const iconNameByRoute: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
    Home: "newspaper-outline",
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
          headerShown: true,
          headerTitleAlign: "left",
          headerTitle: () => (
            <View style={styles.brandHeaderWrap}>
              <Image source={stactaLogo} style={styles.brandLogo} resizeMode="contain" />
              <Text style={[styles.brandTitle, fontLoaded ? styles.brandTitleBungeeHairline : null]}>Stacta</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: "#070A11",
            shadowColor: "transparent",
            elevation: 0,
          },
          headerShadowVisible: false,
          headerTintColor: "#FFFFFF",
          tabBarActiveTintColor: "#FCD34D",
          tabBarInactiveTintColor: "#FFFFFF8F",
          tabBarIcon: ({ color, size, focused }) => {
            if (route.name === "Search") {
              return (
                <SvgLib.Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                  <SvgLib.Path
                    d="m21 21-4.34-4.34"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgLib.Circle
                    cx="11"
                    cy="11"
                    r="8"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                  />
                </SvgLib.Svg>
              );
            }
            if (route.name === "Alerts") {
              return (
                <SvgLib.Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                  <SvgLib.Path
                    d="M10.268 21a2 2 0 0 0 3.464 0"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgLib.Path
                    d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </SvgLib.Svg>
              );
            }
            if (route.name === "People") {
              return (
                <SvgLib.Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                  <SvgLib.Path
                    d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgLib.Path
                    d="M16 3.128a4 4 0 0 1 0 7.744"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgLib.Path
                    d="M22 21v-2a4 4 0 0 0-3-3.87"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <SvgLib.Circle
                    cx="9"
                    cy="7"
                    r="4"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                  />
                </SvgLib.Svg>
              );
            }
            if (route.name === "Me") {
              return (
                <SvgLib.Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                  <SvgLib.Circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                  />
                  <SvgLib.Circle
                    cx="12"
                    cy="10"
                    r="3"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                  />
                  <SvgLib.Path
                    d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"
                    stroke={color}
                    strokeWidth={focused ? 2.4 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </SvgLib.Svg>
              );
            }
            const base = iconNameByRoute[route.name as keyof MainTabParamList];
            const activeName =
              base === "newspaper-outline"
                ? "newspaper"
                : base === "people-outline"
                    ? "people"
                  : base === "notifications-outline"
                      ? "notifications"
                      : "person";
            return <Ionicons name={focused ? activeName : base} size={size} color={color} />;
          },
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#0B0F18",
            borderTopWidth: 0,
            borderTopColor: "transparent",
            elevation: 0,
            shadowOpacity: 0,
            height: 68,
            paddingTop: 10,
            paddingBottom: 1,
          },
          tabBarItemStyle: { paddingVertical: 1 },
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

const styles = StyleSheet.create({
  brandHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  brandLogo: {
    width: 45,
    height: 45,
    borderRadius: 7,
    marginTop: -8,
  },
  brandTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: 0.1,
    fontWeight: "600",
    fontFamily: Platform.select({
      ios: "System",
      android: "sans-serif-medium",
      default: "sans-serif",
    }),
  },
  brandTitleBungeeHairline: {
    fontFamily: "BungeeHairline_400Regular",
    fontSize: 30,
    lineHeight: 30,
    letterSpacing: 0.5,
    fontWeight: "400",
  },
});
