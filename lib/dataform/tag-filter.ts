/**
 * Tag-filter helpers. Pure functions over compiled-action maps + invocations.
 *
 * The filter answers two related questions:
 *   1. "Which tags exist in this repo?" → for the dropdown.
 *   2. "Restrict the dashboard to actions matching these tags" → applied
 *      before any aggregation runs. The output is a re-summarized list of
 *      invocations whose actions have been narrowed to the matching subset.
 */
import type {
  CompiledAction,
  InvocationActionMini,
  WorkflowInvocationWithActions,
} from "./types";
import { UNTAGGED_TAG } from "./types";
import { summarizeActions } from "./adapter";

/**
 * Sorted unique list of tags found across the compilation map. The pseudo-tag
 * `untagged` is appended at the end if at least one action carries no tag.
 *
 * Accepts either a Map or a plain Record — useful because Next.js's
 * `unstable_cache` JSON-serializes return values and a Map round-trips as `{}`.
 */
export function extractAllTags(
  compiled: Map<string, CompiledAction> | Record<string, CompiledAction>,
): string[] {
  const set = new Set<string>();
  let hasUntagged = false;
  const values = compiled instanceof Map ? compiled.values() : Object.values(compiled);
  for (const action of values) {
    if (action.type === "DECLARATION") continue;
    if (action.tags.length === 0) hasUntagged = true;
    for (const t of action.tags) set.add(t);
  }
  const list = Array.from(set).sort((a, b) => a.localeCompare(b));
  // Only expose `untagged` as a filter option when at least one real tag also
  // exists — otherwise the dropdown would have a single "untagged" option
  // that filters to "everything", which is useless noise.
  if (hasUntagged && list.length > 0) list.push(UNTAGGED_TAG);
  return list;
}

/**
 * Decide whether the action carrying these tags matches the selection.
 * Default mode is "any" — match if at least one selected tag is present.
 * `selectedTags` may include `untagged` to opt-in untagged actions.
 */
export function actionMatches(
  actionTags: readonly string[],
  selectedTags: readonly string[],
): boolean {
  if (selectedTags.length === 0) return true;
  if (selectedTags.includes(UNTAGGED_TAG) && actionTags.length === 0) return true;
  return actionTags.some((t) => selectedTags.includes(t));
}

/**
 * Apply the tag filter to a list of invocations. For each invocation:
 *   - actions are filtered to those whose target.full has compiled-tags
 *     matching the selection
 *   - re-summarized so KPI counts (assertionsTotal, actionsFailed, etc.)
 *     reflect only the visible subset
 *   - invocations with zero matching actions are dropped
 *
 * If `selectedTags` is empty, returns the input unchanged.
 *
 * Declarations (raw tables, no compute) are excluded from the visible set
 * when a tag filter is active — they have no tags by design and including
 * them in untagged would create noise.
 */
export function applyTagFilter(
  invocations: WorkflowInvocationWithActions[],
  compiledByTarget:
    | Map<string, CompiledAction>
    | Record<string, CompiledAction>,
  selectedTags: readonly string[],
): WorkflowInvocationWithActions[] {
  if (selectedTags.length === 0) return invocations;

  const lookup = (full: string): CompiledAction | undefined =>
    compiledByTarget instanceof Map
      ? compiledByTarget.get(full)
      : compiledByTarget[full];

  const out: WorkflowInvocationWithActions[] = [];
  for (const inv of invocations) {
    const filtered = inv.actions.filter((a: InvocationActionMini) => {
      if (a.type === "DECLARATION") return false;
      const tags = lookup(a.target.full)?.tags ?? [];
      return actionMatches(tags, selectedTags);
    });
    if (filtered.length === 0) continue;
    out.push(summarizeActions(inv, filtered));
  }
  return out;
}

/**
 * Parse a comma-separated tag list from a URL search param.
 * Empty / missing values yield `[]` (no filter active).
 */
export function parseTagsParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
