# Contributing to Dataform Sentinel

Thanks for considering a contribution! The project is small, single-service, and happy to stay that way — we value minimal surface area and clear seams.

## Development loop

```bash
pnpm install
cp config.yaml.example config.yaml   # or just export SENTINEL_MOCK=1
SENTINEL_MOCK=1 pnpm dev              # serve fixture data, no GCP needed
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four must pass before a PR is merged. CI runs them for you on every pull request.

## Code style

- TypeScript `strict` — no `any`, no `@ts-ignore`.
- Server Components by default; mark `"use client"` only when needed.
- Aggregations must be pure functions in `lib/dataform/aggregations.ts` and tested with Vitest.
- Follow the design tokens in `app/globals.css`. Never use orange for run status colors.

## Areas where PRs are welcome

- Additional aggregations / analytics (e.g. "release health", MTTR)
- New chart types respecting the existing tokens
- Cloud Run deployment improvements (multi-region, IAP variants)
- i18n / multi-timezone handling

## Areas that need discussion first

- Adding a database or cache store (the "live-only" design is intentional)
- Re-introducing a scheduler
- Any new network dependency

Open an issue to discuss these before writing code.

## Licensing

By contributing, you agree your contributions are licensed under the MIT License.
