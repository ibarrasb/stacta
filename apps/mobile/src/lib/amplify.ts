import { Amplify } from "aws-amplify";

let isConfigured = false;

type AmplifySetupResult =
  | { ok: true }
  | { ok: false; missingVars: string[] };

export function configureAmplify(): AmplifySetupResult {
  if (isConfigured) return { ok: true };

  const userPoolId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID;

  const missingVars: string[] = [];
  if (!userPoolId) missingVars.push("EXPO_PUBLIC_COGNITO_USER_POOL_ID");
  if (!userPoolClientId) missingVars.push("EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID");

  if (missingVars.length) return { ok: false, missingVars };

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });

  isConfigured = true;
  return { ok: true };
}
