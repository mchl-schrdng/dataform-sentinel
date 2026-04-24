# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-04-24T05:16:55.601Z
> Files: 121 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `.dockerignore` — Docker ignore rules (~66 tok)
- `.eslintrc.json` — ESLint configuration (~80 tok)
- `.gitignore` — Git ignore rules (~161 tok)
- `.prettierrc` — Prettier configuration (~41 tok)
- `CLAUDE.md` — OpenWolf (~57 tok)
- `components.json` (~116 tok)
- `config.yaml` (~288 tok)
- `config.yaml.example` — Dataform Sentinel configuration. (~279 tok)
- `CONTRIBUTING.md` — Contributing to Dataform Sentinel (~358 tok)
- `Dockerfile` — Docker container definition (~451 tok)
- `LICENSE` — Project license (~290 tok)
- `next-env.d.ts` — / <reference types="next" /> (~75 tok)
- `next.config.ts` — Next.js configuration (~117 tok)
- `package.json` — Node.js package manifest (~559 tok)
- `pnpm-lock.yaml` — pnpm lock file (~74745 tok)
- `postcss.config.mjs` — Declares config (~26 tok)
- `README.md` — Project documentation (~2748 tok)
- `tailwind.config.ts` — Tailwind CSS configuration (~119 tok)
- `tsconfig.json` — TypeScript configuration (~198 tok)
- `tsconfig.tsbuildinfo` (~70963 tok)
- `vitest.config.ts` — Vitest test configuration (~82 tok)

## .claude/

- `settings.json` (~441 tok)
- `settings.local.json` (~193 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## .github/workflows/

- `ci.yml` — CI: CI (~236 tok)
- `release.yml` — CI: Release (~347 tok)

## app/

- `globals.css` — Styles: 12 rules, 70 vars, 1 animations, 2 layers (~1522 tok)
- `layout.tsx` — inter (~294 tok)
- `not-found.tsx` — NotFound (~186 tok)

## app/(dashboard)/

- `layout.tsx` — DashboardLayout (~172 tok)
- `page.tsx` — dynamic (~1276 tok)

## app/(dashboard)/repos/[targetKey]/

- `page.tsx` — dynamic (~2312 tok)

## app/(dashboard)/repos/[targetKey]/assertions/

- `page.tsx` — dynamic (~1301 tok)

## app/(dashboard)/repos/[targetKey]/invocations/[invocationId]/

- `page.tsx` — dynamic (~625 tok)

## app/api/health/

- `route.ts` — Next.js API route: GET (~195 tok)

## app/api/targets/[targetKey]/assertions/

- `route.ts` — Next.js API route: GET (~383 tok)

## app/api/targets/[targetKey]/assertions/rerun/

- `route.ts` — Next.js API route: POST (~257 tok)

## app/api/targets/[targetKey]/invocations/

- `route.ts` — Next.js API route: GET, POST (~385 tok)

## app/api/targets/[targetKey]/invocations/[invocationId]/

- `route.ts` — Next.js API route: GET, DELETE (~269 tok)

## app/api/targets/[targetKey]/invocations/[invocationId]/rerun/

- `route.ts` — Next.js API route: POST (~160 tok)

## app/api/targets/[targetKey]/kpis/

- `route.ts` — Next.js API route: GET (~286 tok)

## components/app-shell/

- `header.tsx` — Header (~310 tok)
- `identity-avatar.tsx` — Actor service account email, as resolved from SENTINEL_SERVICE_ACCOUNT or config. (~739 tok)
- `logo.tsx` — SentinelLogo (~156 tok)
- `target-switcher.tsx` — TargetSwitcher (~479 tok)

## components/assertions-detail/

- `assertion-drawer.tsx` — COLOR_DOT — renders modal (~1269 tok)
- `assertions-kpis.tsx` — AssertionsKpisRow (~346 tok)
- `assertions-table.tsx` — COLOR_DOT — renders table — uses useState, useMemo (~1262 tok)
- `quality-timeline.tsx` — SLO_THRESHOLD (~1625 tok)

## components/invocation-detail/

- `action-side-panel.tsx` — ActionSidePanel — uses useState (~1263 tok)
- `actions-bar.tsx` — ActionsBar — uses useRouter (~600 tok)
- `assertions-view.tsx` — AssertionsView — uses useRouter (~785 tok)
- `compiled-sql-view.tsx` — CompiledSqlView — uses useState (~748 tok)
- `dag-node.tsx` — NODE_WIDTH (~502 tok)
- `dag-view.tsx` — nodeTypes — uses useMemo, useEffect, useCallback (~1354 tok)
- `header.tsx` — InvocationHeaderGrid (~457 tok)
- `list-view.tsx` — ListView — renders table — uses useState, useMemo (~1319 tok)
- `tabs.tsx` — InvocationTabs (~394 tok)

## components/overview/

- `global-kpis.tsx` — direction (~642 tok)
- `repo-card.tsx` — RepoCard (~1023 tok)

## components/providers/

- `query-provider.tsx` — QueryProvider — uses useState (~150 tok)

## components/repo-dashboard/

- `assertions-heatmap.tsx` — When true, show all assertions (no row limit). (~1165 tok)
- `duration-histogram.tsx` — DurationHistogram — renders chart (~710 tok)
- `invocation-row-actions.tsx` — InvocationRowActions (~1084 tok)
- `invocations-table.tsx` — InvocationsTable — renders table (~1793 tok)
- `repo-kpis.tsx` — direction (~561 tok)
- `run-workflow-button.tsx` — RunWorkflowButton — renders modal (~656 tok)
- `runs-timeline-chart.tsx` — COLOR — renders chart — uses useRouter, useMemo (~1913 tok)
- `success-rate-chart.tsx` — SuccessRateChart — renders chart (~652 tok)
- `top-failing-actions.tsx` — TopFailingActions (~352 tok)

## components/shared/

- `breadcrumbs.tsx` — Breadcrumbs (~301 tok)
- `empty-state.tsx` — EmptyState (~263 tok)
- `error-state.tsx` — ErrorState (~325 tok)
- `kpi-tile.tsx` — TONE_CLASS (~553 tok)
- `period-selector.tsx` — PERIODS (~285 tok)
- `refresh-button.tsx` — RefreshButton — uses useRouter, useState (~241 tok)
- `relative-time.tsx` — Seconds between re-renders. (~321 tok)
- `sparkline.tsx` — Values in natural order (oldest first). null = no data. (~558 tok)
- `status-bars.tsx` — Chronological order (oldest first). (~292 tok)
- `status-pill.tsx` — LABELS (~884 tok)

## components/shared/skeletons/

- `cards-grid-skeleton.tsx` — CardsGridSkeleton (~270 tok)
- `kpi-row-skeleton.tsx` — KpiRowSkeleton (~172 tok)

## components/ui/

- `badge.tsx` — badgeVariants (~258 tok)
- `button.tsx` — buttonVariants (~566 tok)
- `card.tsx` — Card (~511 tok)
- `dialog.tsx` — Dialog — renders modal (~894 tok)
- `dropdown-menu.tsx` — DropdownMenu (~728 tok)
- `input.tsx` — Input (~218 tok)
- `scroll-area.tsx` — ScrollArea (~445 tok)
- `separator.tsx` — Separator (~200 tok)
- `skeleton.tsx` — Skeleton (~73 tok)
- `table.tsx` — Table — renders table (~598 tok)
- `tabs.tsx` — Tabs (~530 tok)
- `toggle-group.tsx` — ToggleGroup (~394 tok)
- `tooltip.tsx` — TooltipProvider (~244 tok)

## deploy/cloud-run/

- `service.yaml` — Plain Cloud Run v2 manifest — for users who prefer `gcloud run services replace` (~531 tok)

## examples/with-iap/

- `main.tf` — Optional example: put the Cloud Run service behind a global HTTPS Load Balancer (~1018 tok)
- `README.md` — Project documentation (~277 tok)

## lib/

- `api-utils.ts` — Exports ApiHandler, withTarget (~283 tok)
- `logger.ts` — Exports logger, Logger (~121 tok)
- `utils.ts` — Format a duration in milliseconds as e.g. "4m 12s" or "11m 03s". (~610 tok)

## lib/config/

- `index.ts` — Resolve the service account used for workflow invocation act-as. (~454 tok)
- `load.ts` — Exports ConfigLoadError, loadConfigFromDisk (~459 tok)
- `mock.ts` — Exports mockConfig (~367 tok)
- `schema.ts` — Optional. Service account email that Dataform workflow invocations run (~404 tok)

## lib/dataform/

- `adapter.ts` — Converts raw Dataform API shapes to the narrower domain types (~1841 tok)
- `aggregations.test.ts` — mkInvocation: mkAction (~2157 tok)
- `aggregations.ts` — Pure aggregation functions operating on lists of invocations. (~4924 tok)
- `client.ts` — Exports getDataformClient, repositoryName (~185 tok)
- `fixtures.ts` — Deterministic fixture data used by SENTINEL_MOCK=1. (~2656 tok)
- `index.ts` (~64 tok)
- `invocations.ts` — List invocations for a repo, cached at the server for 10s to deduplicate (~3051 tok)
- `types.ts` — Domain types used throughout the app. (~682 tok)

## scripts/

- `publish-internal.sh` — Build and push the dataform-sentinel image to a private Artifact Registry (~339 tok)
- `setup.sh` — Dataform Sentinel — interactive installer. (~1756 tok)

## terraform/

- `main.tf` (~1854 tok)
- `outputs.tf` (~124 tok)
- `README.md` — Project documentation (~857 tok)
- `terraform.tfvars.example` — Copy to terraform.tfvars and edit for your environment. (~357 tok)
- `variables.tf` (~684 tok)
- `versions.tf` (~44 tok)
