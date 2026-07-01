# Stacta Mobile

Expo + React Native mobile app for Stacta.

Unless a step says otherwise, run commands from the repository root.

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop, for Postgres and Redis
- Java 21, for the Spring Boot API
- Xcode, for iOS Simulator or iPhone development
- Android Studio, for Android Emulator development

## First-time setup

Install mobile dependencies:

```bash
cd apps/mobile
npm ci
```

Create the mobile environment file:

```bash
cp .env.example .env
```

For iOS Simulator development, `apps/mobile/.env` should contain:

```bash
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_API_URL=http://localhost:8082
```

Use the real Cognito values for the Stacta development user pool.

For Android Emulator, use the Android host alias:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:8082
```

For a physical phone, use your computer's LAN IP address:

```bash
EXPO_PUBLIC_API_URL=http://192.168.50.190:8082
```

## Run the backend

The mobile app uses API port `8082` locally because Metro commonly uses `8081`.

Start Postgres and Redis:

```bash
cd services/api
docker compose up -d
```

Start the API on port `8082`:

```bash
cd services/api
PORT=8082 ./gradlew bootRun
```

Confirm the API is up:

```bash
curl http://localhost:8082/health
```

Expected response:

```text
stacta-api ok
```

The API still uses the default local database and cache:

```text
Postgres: localhost:15432
Redis:    localhost:16379
API:      localhost:8082
```

Flyway migrations run automatically when the API starts.

## Run the mobile UI

For the simplest Expo dev server:

```bash
cd apps/mobile
npm run dev
```

Then choose the target from the Expo terminal UI.

For the development build workflow:

```bash
cd apps/mobile
npm run ios
npm run start:dev-client
```

`npm run ios` builds and installs the native dev client in the iOS Simulator.
`npm run start:dev-client` starts Metro for that development build.

## Daily local workflow

Use three terminals:

```bash
# Terminal 1: database and cache
cd services/api
docker compose up -d
```

```bash
# Terminal 2: API for mobile
cd services/api
PORT=8082 ./gradlew bootRun
```

```bash
# Terminal 3: mobile app
cd apps/mobile
npm run dev
```

## Useful scripts

- `npm run dev` - start the Expo dev server
- `npm run start:dev-client` - start Metro for development builds
- `npm run ios` - build and run the iOS development build
- `npm run android` - build and run the Android development build
- `npm run web` - run the Expo web preview
- `npm run prebuild` - regenerate native `ios` and `android` folders from Expo config
- `npm run test` - run Jest tests

## Troubleshooting

- If the app cannot reach the API, confirm `EXPO_PUBLIC_API_URL` matches your target and `curl http://localhost:8082/health` works on your computer.
- If you change `.env`, stop Expo and restart it. If the old value sticks, run `npx expo start --clear`.
- If Metro says port `8081` is already in use, stop the existing Metro process and restart Expo.
- If the API cannot start on `8082`, another process is using it. Stop that process or use a different `PORT` value and update `EXPO_PUBLIC_API_URL`.
- If local network discovery fails for a physical phone, run `npx expo start --dev-client --tunnel`.
- Physical iPhone development builds require Apple code signing setup in Xcode.
