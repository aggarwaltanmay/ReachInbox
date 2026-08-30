# ReachInbox email scheduler

A full-stack TypeScript email scheduler built around durable PostgreSQL records and BullMQ delayed jobs. It uses Ethereal SMTP for safe test delivery, Elasticsearch for search, a live BullMQ UI, Google login, and real Slack OAuth notifications on hourly sender limits.

## Quick start

1. Copy `.env.example` to `.env`, then set the OAuth and Ethereal values described below.
2. Start stateful services: `docker compose up -d`.
3. Install and run: `npm install` then `npm run dev`.
4. Open `http://localhost:5173`; queue telemetry is at `http://localhost:4000/admin/queues`.

The API creates and upgrades its PostgreSQL schema on startup. `ETHEREAL_USER` and `ETHEREAL_PASS` are required: startup fails clearly when they are absent so the dashboard can never mark a non-SMTP message as sent.

## Environment and OAuth

Create a Google OAuth web client, set its callback to `http://localhost:4000/auth/google/callback`, and populate `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Google identity is verified through the provider token exchange and a signed application JWT is returned to the web app.

Create a server-style Slack app (PKCE disabled for the localhost bot installation), enable Incoming Webhooks, add the `chat:write` and `incoming-webhook` bot scopes, set its redirect URL to `http://localhost:4000/integrations/slack/callback`, and populate the Slack client values. The dashboard's **Connect Slack** launches Slack's real OAuth flow and asks the user to select a channel. The backend stores the bot token, webhook URL, and selected channel per user. Rate-limit alerts use that webhook and validate Slack's HTTP response; disconnected users are skipped safely and reconnecting takes effect without redeployment.

To create Ethereal credentials, visit [Ethereal Email](https://ethereal.email/), create an account, and place its SMTP username/password in `.env`.

## Architecture

```text
Browser
   │
   ├── Google OAuth authentication
   │
   ▼
React + Vite frontend (:5173)
   │
   ▼
Express API (:4000)
   │
   ├── PostgreSQL ───── users, emails, idempotency and Slack connections
   ├── Redis/BullMQ ─── persistent delayed jobs, pacing and hourly counters
   ├── Elasticsearch ── searchable scheduled and delivered email records
   ├── Ethereal SMTP ── safe fake email delivery
   └── Slack OAuth ──── rate-limit notifications to the selected channel
```

This is an npm-workspaces monorepo containing an Express backend and a React frontend. PostgreSQL is the authoritative source for email state, while BullMQ and Redis provide persistent delayed execution. Elasticsearch is a secondary search index rather than the source of truth.

### Email scheduling flow

1. The user authenticates through Google OAuth and receives a signed application JWT.
2. The user composes a campaign, uploads a CSV/TXT lead list, and configures the start time, delay, and hourly limit.
3. React sends the campaign to `POST /emails/schedule` with a client-generated request UUID.
4. Express validates the payload with Zod.
5. A PostgreSQL transaction claims the request UUID and inserts the complete campaign atomically.
6. Stable BullMQ delayed jobs (`email-<UUID>`) are created in batches, using each email's scheduled timestamp.
7. At the scheduled time, a concurrent worker checks the Redis-backed hourly quota and global pacing reservation.
8. Jobs beyond the sender limit are moved to the next UTC hourly window instead of being dropped or failed.
9. Eligible jobs are atomically claimed in PostgreSQL and sent through Ethereal SMTP.
10. PostgreSQL is updated to `sent` or `failed`, Elasticsearch receives the updated document, and Slack is notified when a sender reaches its limit.

### Persistence, recovery, and idempotency

Each schedule request contains a client-generated request UUID. A PostgreSQL transaction claims that UUID and inserts the entire campaign atomically; retrying the same request returns the existing rows instead of duplicating recipients. If Redis is temporarily unavailable, the durable rows remain and the same request or startup reconciliation restores their jobs.

Before SMTP, the worker atomically changes a row from `scheduled` to `processing`. SMTP does not provide a true idempotency API, so an attempted send is never retried: a crash with an ambiguous provider outcome becomes `failed` on restart instead of risking a duplicate. This is an explicit at-most-once trade-off in favor of the assignment's hard no-duplicate constraint. Rows still in `scheduled` are safely restored after restart.

On startup, the API runs schema migrations, initializes and backfills the Elasticsearch index, reconciles scheduled PostgreSQL rows with BullMQ, verifies Ethereal SMTP, starts the worker, and finally listens on port `4000`. Redis uses append-only persistence and PostgreSQL stores durable business state, so restarting the Node server does not restart campaigns from the beginning.

## Project structure

```text
reachinbox-email-scheduler-full-local/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/env.ts
│   │   │   ├── db/index.ts
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts
│   │   │   │   └── search.ts
│   │   │   ├── queue/
│   │   │   │   ├── emailQueue.ts
│   │   │   │   └── worker.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   │   ├── emails/
│       │   │   ├── layout/
│       │   │   └── ui/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── pages/
│       │   ├── types/
│       │   ├── App.tsx
│       │   ├── index.css
│       │   └── main.tsx
│       ├── package.json
│       ├── tailwind.config.js
│       └── vite.config.ts
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
└── README.md
```

### Backend folders

- `apps/api/src/index.ts` is the main backend entry point. It configures Express, mounts Bull Board, exposes authentication/email/Slack APIs, performs startup recovery, and starts the worker.
- `apps/api/src/config/env.ts` loads the root `.env` file and validates configuration with Zod.
- `apps/api/src/db/index.ts` owns the PostgreSQL connection and startup schema migrations for users, emails, schedule requests, and Slack connections.
- `apps/api/src/lib/auth.ts` creates/verifies JWTs and protects authenticated routes.
- `apps/api/src/lib/search.ts` creates the Elasticsearch mapping, indexes email changes, performs tenant-filtered search, and provides a PostgreSQL fallback.
- `apps/api/src/queue/emailQueue.ts` creates the shared BullMQ queue and Redis connection.
- `apps/api/src/queue/worker.ts` handles concurrency, persistent pacing reservations, hourly sender limits, Ethereal delivery, database transitions, search indexing, and Slack notifications.

### Frontend folders

- `apps/web/src/pages/LoginPage.tsx` contains the interactive landing page, dark mode, and Google sign-in entry point.
- `apps/web/src/pages/Dashboard.tsx` contains live statistics, tabs, filtering, search, Slack controls, and campaign actions.
- `apps/web/src/components/emails/ComposeModal.tsx` implements the three-stage campaign form, lead parsing, pacing controls, review, and submission.
- `apps/web/src/components/emails/EmailTable.tsx` renders sortable and expandable scheduled/sent email rows.
- `apps/web/src/components/emails/StatsCards.tsx` renders animated queue statistics and status filters.
- `apps/web/src/components/ui/` contains reusable buttons, badges, modals, loading indicators, and empty states.
- `apps/web/src/hooks/` contains authentication, email polling/search, and toast state.
- `apps/web/src/lib/api.ts` is the centralized authenticated HTTP client; `utils.ts` contains lead parsing and date helpers.
- `apps/web/src/types/` contains shared frontend TypeScript models for users, emails, statistics, Slack status, and schedule payloads.

### Root files

- `package.json` defines npm workspaces and combined `dev`/`build` scripts.
- `docker-compose.yml` starts PostgreSQL, Redis with AOF persistence, and Elasticsearch.
- `.env.example` documents required configuration. The real `.env` contains secrets and must never be committed.
- `README.md` documents setup, architecture, behavior, trade-offs, and requirement coverage.

## Throughput controls

- `WORKER_CONCURRENCY` configures parallel worker execution (default `5`).
- A Redis Lua reservation enforces `MIN_SEND_INTERVAL_MS` globally (default **2 seconds** between actual send attempts), safely across worker processes. Jobs that are already hourly-capped are delayed before consuming a global send slot.
- A Redis `INCR` counter per `sender + UTC hour` implements `MAX_EMAILS_PER_HOUR_PER_SENDER` (default `200`). Counters have a TTL, so the design is safe across workers/instances.
- Both counter keys and next-window calculations use the same epoch-based UTC hour. At the cap the job is moved to the next UTC boundary, not failed or dropped. One Redis marker permits at most one Slack alert per user, sender, and hour. This naturally handles 1,000 concurrent scheduled sends: the queue absorbs the burst and releases capacity according to the global interval and sender window.

The Docker stack includes Elasticsearch. The API creates the versioned `emails-v1` index with explicit keyword mappings for IDs and tenant filtering, backfills stored rows on startup, and indexes scheduled/sent updates. PostgreSQL is used as a temporary search fallback if Elasticsearch is unavailable.

## API

- `POST /emails/schedule` — authenticated; `{ requestId, sender, recipients, subject, body, startAt, delayMs, hourlyLimitPerSender? }`
- `GET /emails?status=scheduled|sent|failed` — authenticated list for dashboard (`scheduled` includes `processing`; `sent` includes `failed`)
- `GET /emails/search?q=` — Elasticsearch-backed search with Postgres fallback
- `GET /emails/stats` — per-status counts for dashboard cards
- `GET /admin/queues` — live BullMQ dashboard
- `GET /auth/google` and authenticated `POST /integrations/slack/connect` — OAuth entry points
- `GET /integrations/slack/status` and `DELETE /integrations/slack` — Slack connection management

## Frontend

The React dashboard lives in `apps/web` with a componentized structure:

- `components/` — reusable UI (Button, Badge, Modal, tables)
- `pages/` — Login and Dashboard
- `hooks/` — auth, email polling, toast notifications

Interactive features:

- Live auto-refresh (5s scheduled / 15s sent tabs)
- Elasticsearch search bar with loading state
- Toast feedback on schedule / Slack connect
- Drag-and-drop CSV lead upload
- Stats cards (scheduled, processing, sent, failed)
- Slack connect status + disconnect
- Link to live BullMQ dashboard

## Trade-offs

An SMTP failure consumes an hourly slot and is not retried because the provider may have accepted the message before returning an error—conservative, but it prevents duplicate delivery. The frontend lets the user choose campaign spacing while the server still enforces a cross-instance minimum interval. In a production deployment, OAuth tokens and webhook URLs would be encrypted at rest and Elasticsearch backfill would run as a paginated background migration.

## Requirement checklist

- **Backend:** Express + TypeScript API, PostgreSQL persistence, BullMQ delayed jobs, Redis recovery/rate state, configurable worker concurrency, cross-instance pacing, per-sender hourly limits, Ethereal SMTP, Elasticsearch indexing/search, Bull Board, transactional request idempotency, Google OAuth, Slack OAuth/webhook notifications, and disconnect/reconnect.
- **Frontend:** React + TypeScript + Tailwind, real Google login, user header/avatar/logout, scheduled and sent tabs, compose modal, CSV/TXT parsing and lead count, local start time, pacing/hourly controls, loading/empty/error states, search, queue dashboard link, responsive design, animations, and dark mode.
- **Infrastructure:** Docker Compose for PostgreSQL, Redis with AOF persistence, and Elasticsearch. No cron library or operating-system cron is used.
