# Mobile (Expo)

This is the native mobile app for Stacta using Expo + React Native.

## Environment

Create `apps/mobile/.env` (copy `.env.example`) and set:

```bash
EXPO_PUBLIC_COGNITO_USER_POOL_ID=...
EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=...
EXPO_PUBLIC_API_URL=http://localhost:8082
```

For a physical iPhone, use your LAN IP instead of localhost, for example:
`EXPO_PUBLIC_API_URL=http://192.168.50.190:8082`

## Run

```bash
cd apps/mobile
npm run dev
```

For a development build workflow (SDK 55), use:

```bash
cd apps/mobile
npm run ios
npm run start:dev-client
```

`npm run ios` builds/installs the native dev client in the iOS Simulator.
`npm run start:dev-client` starts Metro for that development build.

## Useful scripts

- `npm run dev` - start Expo dev server
- `npm run start:dev-client` - start Metro for development builds
- `npm run ios` - build and run iOS development build (simulator)
- `npm run android` - build and run Android development build
- `npm run web` - run web preview
- `npm run prebuild` - regenerate native ios/android folders from Expo config

## Notes

- If Metro is already using port 8081, stop the existing process before running `npm run ios`.
- Physical iPhone development build requires Apple code signing setup in Xcode.
- If local network discovery fails while starting Metro, run:

```bash
npx expo start --dev-client --tunnel
```
