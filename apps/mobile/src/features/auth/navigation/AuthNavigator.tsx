import type { ImageSourcePropType } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ConfirmScreen } from "../screens/ConfirmScreen";
import { SignInScreen } from "../screens/SignInScreen";
import { SignUpScreen } from "../screens/SignUpScreen";

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  Confirm: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

type AuthNavigatorProps = {
  logo: ImageSourcePropType;
};

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#070A11",
    card: "#070A11",
  },
};

export function AuthNavigator({ logo }: AuthNavigatorProps) {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="SignIn" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SignIn">
          {(props) => <SignInScreen {...props} logo={logo} />}
        </Stack.Screen>
        <Stack.Screen name="SignUp">
          {(props) => <SignUpScreen {...props} logo={logo} />}
        </Stack.Screen>
        <Stack.Screen name="Confirm">
          {(props) => <ConfirmScreen {...props} logo={logo} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
