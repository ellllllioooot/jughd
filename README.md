# جغد (Jughd) — نظارت وضعیت بدن

Webcam posture monitoring: the browser watches neck/shoulder/slouch geometry
against a per-user baseline and warns on sustained deviation. All image
processing stays on the device — only numeric landmark data reaches the
server (see `docs/architecture.md`).

Persian-first (RTL) UI, freemium quota (12 monitored hours/month free), and
cited wellness content.

## Stack

- **web/** — React 19 + Vite, MediaPipe PoseLandmarker in a Web Worker
- **api/** — Express + Prisma 6 + PostgreSQL 16, scrypt cookie sessions
- Docker Compose (dev + prod profiles) with Caddy TLS (webcam needs a secure context)

## Setup (dev)

```sh
docker compose --profile dev up          # db + api (watch) + web (Vite dev)
docker compose exec api npx prisma migrate dev   # first run only
```

Or without Docker: Node 22 + PostgreSQL 16, then `npm install` in `api/` and
`web/`, copy `.env.example` → `api/.env`, run `npx prisma migrate dev`, and
start both with `npm run dev`.

## Tests

```sh
cd api && npm test    # unit + contract tests (supertest): auth, quota math, privacy
cd web && npm test    # geometry engine, alert state machine, content citations, copy
```

## Deploy (prod)

```sh
docker compose --profile prod up -d --build
docker compose exec api npx prisma migrate deploy
```

Caddy terminates TLS at `{$DOMAIN}` and proxies `/api/*` to the API. Set
`DOMAIN`, `SESSION_SECRET`, `DATABASE_URL`, and VAPID keys (see
`.env.example`) before starting.

## Privacy (constitution I)

No image or video ever leaves the browser. The worker reduces camera frames to
33 pose landmarks (x/y/z + confidence numbers), and the API rejects any
landmark payload with non-numeric or binary fields (`api/tests/privacy.test.ts`
enforces this).

## Documentation

- `docs/architecture.md` — components, data flow, citations appendix
- `specs/001-posture-monitoring-mvp/` — spec, plan, contracts, quickstart
