# Stacta Web

React + TypeScript + Vite web app for Stacta.

Unless a step says otherwise, run commands from the repository root.

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop, for Postgres and Redis
- Java 21, for the Spring Boot API

## First-time setup

Install web dependencies:

```bash
cd apps/web
npm ci
```

Create the web environment file:

```bash
cp .env.example .env
```

For local development, `apps/web/.env` should contain:

```bash
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_URL=http://localhost:8081
```

Use the real Cognito values for the Stacta development user pool.

## Run the backend

The backend has two parts:

- Postgres and Redis run through Docker Compose.
- The Spring Boot API runs through Gradle.

Start Postgres and Redis:

```bash
cd services/api
docker compose up -d
```

Start the API:

```bash
cd services/api
./gradlew bootRun
```

The API runs on `http://localhost:8081` by default. Confirm it is up:

```bash
curl http://localhost:8081/health
```

Expected response:

```text
stacta-api ok
```

The default `dev` Spring profile points at:

```text
Postgres: localhost:15432
Redis:    localhost:16379
API:      localhost:8081
```

Flyway migrations run automatically when the API starts.

## Run the web UI

In a new terminal:

```bash
cd apps/web
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Daily local workflow

Use three terminals:

```bash
# Terminal 1: database and cache
cd services/api
docker compose up -d
```

```bash
# Terminal 2: API
cd services/api
./gradlew bootRun
```

```bash
# Terminal 3: web app
cd apps/web
npm run dev
```

## Useful commands

```bash
npm run build
npm run test
npm run test:watch
npm run lint
npm run e2e
```

Install the Playwright browser before running e2e tests for the first time:

```bash
npm run e2e:install
```

## Troubleshooting

- If the UI cannot reach the API, confirm `VITE_API_URL=http://localhost:8081` and `curl http://localhost:8081/health` works.
- If the API fails to connect to Postgres or Redis, confirm Docker Desktop is running and rerun `docker compose up -d` from `services/api`.
- If port `8081` is already in use, stop the existing process or start the API on another port with `PORT=8082 ./gradlew bootRun` and update `VITE_API_URL` to match.
- If environment values change while Vite is running, stop and restart `npm run dev`.
