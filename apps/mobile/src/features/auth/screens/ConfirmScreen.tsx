import { useEffect } from "react";
import type { ImageSourcePropType } from "react-native";
import { Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuthFlowContext } from "../AuthFlowContext";
import { AuthLayout } from "../components/AuthLayout";
import { authStyles as styles } from "../styles";
import type { AuthStackParamList } from "../navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Confirm"> & {
  logo: ImageSourcePropType;
};

export function ConfirmScreen({ navigation, logo }: Props) {
  const flow = useAuthFlowContext();

  useEffect(() => {
    flow.setAuthMode("confirm");
  }, [flow]);

  async function onSubmit() {
    const result = await flow.handleConfirmSignUp();
    if (result === "signIn") {
      navigation.navigate("SignIn");
    }
  }

  return (
    <AuthLayout logo={logo} title="Confirm your email" subtitle="Enter the code we sent to your email.">
      <Text style={styles.fieldLabel}>Email</Text>
      <View style={styles.readOnlyField}>
        <Text style={styles.readOnlyFieldText}>{flow.email.trim() || "No email provided"}</Text>
      </View>
      <TextInput
        value={flow.confirmationCode}
        onChangeText={flow.setConfirmationCode}
        autoCapitalize="none"
        keyboardType="number-pad"
        placeholder="Confirmation code"
        placeholderTextColor="#7D8594"
        style={styles.input}
      />
      {flow.error ? <Text style={styles.errorText}>{flow.error}</Text> : null}
      {flow.info ? <Text style={styles.infoText}>{flow.info}</Text> : null}
      <Pressable
        style={[styles.primaryButton, flow.submitting && styles.disabledButton]}
        onPress={onSubmit}
        disabled={flow.submitting}
      >
        <Text style={styles.primaryButtonText}>{flow.submitting ? "Confirming..." : "Confirm email"}</Text>
      </Pressable>
      <Text style={styles.footerText}>
        Back to{" "}
        <Text
          style={styles.footerLink}
          onPress={() => {
            flow.clearMessages();
            navigation.navigate("SignIn");
          }}
        >
          Sign in
        </Text>
      </Text>
    </AuthLayout>
  );
}
