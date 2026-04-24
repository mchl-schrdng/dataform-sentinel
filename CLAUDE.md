# Dataform Sentinel — working notes

Notes for anyone (including AI assistants) working on this codebase.

## What this is

A stateless, local-only Next.js 15 app that monitors Google Cloud Dataform pipelines on BigQuery. It hits the Dataform API directly — no database, no scheduler, no persistence. Every page computes from live data.

## Architecture in one breath

`app/(dashboard)/page.tsx` loads config + hits Dataform for every target → aggregates with pure functions in `lib/dataform/aggregations.ts` → renders Server Components, with `"use client"` only where truly needed (charts, dialogs, local state).

## Key conventions

- **TypeScript strict.** No `any`, no `@ts-ignore`.
- **Server Components by default.** Only mark `"use client"` when you actually need client-side state, effects, or event handlers.
- **Aggregations are pure functions.** Live in `lib/dataform/aggregations.ts`, unit-tested with Vitest. Data-shaping logic belongs here, not in components.
- **Design tokens.** Defined in `app/globals.css`. Never use orange for run statuses — that's reserved for primary actions and focus rings.
- **Mock mode.** `SENTINEL_MOCK=1` serves fixtures from `lib/dataform/fixtures.ts`. Every UI path must work in mock mode (useful for CI + offline dev).
- **Config is Zod-validated.** See `lib/config/schema.ts`. Fail fast at boot with a clear error, never silently.

## Entry points

```
app/
├── (dashboard)/
│   ├── page.tsx                    # Overview
│   └── repos/[targetKey]/
│       ├── page.tsx                # Repo dashboard
│       ├── assertions/page.tsx     # Assertions deep-dive
│       └── invocations/[invocationId]/page.tsx  # Invocation detail

lib/
├── config/           # YAML load + Zod schema
├── dataform/
│   ├── client.ts     # Dataform SDK wrapper
│   ├── adapter.ts    # raw API → domain types
│   ├── invocations.ts # list/get/create/cancel/rerun
│   ├── aggregations.ts # pure functions (timeline, heatmap, KPIs, ...)
│   └── fixtures.ts   # deterministic mock data
└── api-utils.ts      # withTarget() wrapper for API routes
```

## What NOT to add

- Database or cache store — "live-only" is intentional
- Scheduler / cron
- New network dependencies without discussion
- Framework upgrades across major versions without a dedicated PR

## Dev loop

```bash
pnpm install
SENTINEL_MOCK=1 pnpm dev   # fixtures, no GCP needed
# or
gcloud auth application-default login
pnpm dev                    # real GCP, see README for auth options
```

## Before committing

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

CI runs all four on every PR.

## Anti-patterns

- Fetching data in client components (use Server Components + cached server helpers)
- Mixing concerns: if a component is doing aggregation logic, move it to `lib/dataform/aggregations.ts`
- Hard-coding project IDs or SA emails in source — always from config
- Using `SENTINEL_MOCK` logic inside components — it's a config-layer concern
