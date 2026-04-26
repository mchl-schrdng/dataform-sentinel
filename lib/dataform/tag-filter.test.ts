import { describe, expect, it } from "vitest";
import {
  actionMatches,
  applyTagFilter,
  extractAllTags,
  parseTagsParam,
} from "./tag-filter";
import type {
  CompiledAction,
  InvocationActionMini,
  WorkflowInvocationWithActions,
} from "./types";

function compiled(tags: string[]): CompiledAction {
  return { tags, type: "TABLE" };
}

function action(
  full: string,
  state: "SUCCEEDED" | "FAILED" | "SKIPPED" = "SUCCEEDED",
  type: InvocationActionMini["type"] = "TABLE",
): InvocationActionMini {
  return {
    target: { full, name: full.split(".").slice(-1)[0]! },
    type,
    state,
  };
}

function inv(actions: InvocationActionMini[]): WorkflowInvocationWithActions {
  return {
    id: "i",
    name: "n",
    state: "SUCCEEDED",
    trigger: "scheduled",
    createTime: new Date().toISOString(),
    startTime: new Date().toISOString(),
    actions,
    actionsTotal: actions.length,
    actionsSucceeded: actions.filter((a) => a.state === "SUCCEEDED").length,
    actionsFailed: actions.filter((a) => a.state === "FAILED").length,
    actionsRunning: 0,
    actionsSkipped: actions.filter((a) => a.state === "SKIPPED").length,
    assertionsTotal: 0,
    assertionsSucceeded: 0,
    assertionsFailed: 0,
  };
}

describe("extractAllTags", () => {
  it("returns sorted unique tags", () => {
    const m = new Map<string, CompiledAction>([
      ["a.x", compiled(["zebra", "apple"])],
      ["a.y", compiled(["apple", "banana"])],
    ]);
    expect(extractAllTags(m)).toEqual(["apple", "banana", "zebra"]);
  });

  it("appends 'untagged' if at least one action has no tags", () => {
    const m = new Map<string, CompiledAction>([
      ["a.x", compiled(["foo"])],
      ["a.y", compiled([])],
    ]);
    expect(extractAllTags(m)).toEqual(["foo", "untagged"]);
  });

  it("does not append 'untagged' if every action has tags", () => {
    const m = new Map<string, CompiledAction>([["a.x", compiled(["foo"])]]);
    expect(extractAllTags(m)).toEqual(["foo"]);
  });

  it("returns [] when nothing has any tag (declarations excluded)", () => {
    const m = new Map<string, CompiledAction>([
      ["a.x", compiled([])],
      ["a.y", compiled([])],
    ]);
    expect(extractAllTags(m)).toEqual([]);
  });

  it("ignores DECLARATION actions when computing the tag set", () => {
    const m = new Map<string, CompiledAction>([
      ["raw.a", { tags: [], type: "DECLARATION" }],
      ["a.x", compiled(["foo"])],
    ]);
    // The DECLARATION's empty tags should not produce an `untagged` chip.
    expect(extractAllTags(m)).toEqual(["foo"]);
  });
});

describe("actionMatches (any mode)", () => {
  it("matches when at least one selected tag is present", () => {
    expect(actionMatches(["marketing", "daily"], ["marketing"])).toBe(true);
    expect(actionMatches(["marketing"], ["finance", "marketing"])).toBe(true);
  });

  it("rejects when no selected tag is present", () => {
    expect(actionMatches(["finance"], ["marketing"])).toBe(false);
  });

  it("matches untagged actions when 'untagged' is selected", () => {
    expect(actionMatches([], ["untagged"])).toBe(true);
    expect(actionMatches([], ["marketing", "untagged"])).toBe(true);
  });

  it("does not match untagged unless 'untagged' is in selection", () => {
    expect(actionMatches([], ["marketing"])).toBe(false);
  });

  it("matches everything when selection is empty", () => {
    expect(actionMatches([], [])).toBe(true);
    expect(actionMatches(["x"], [])).toBe(true);
  });
});

describe("applyTagFilter", () => {
  const m = new Map<string, CompiledAction>([
    ["a.mkt", compiled(["marketing"])],
    ["a.fin", compiled(["finance"])],
    ["a.both", compiled(["marketing", "finance"])],
    ["a.untagged", compiled([])],
  ]);

  it("returns input unchanged when selectedTags is empty", () => {
    const i = inv([action("a.mkt"), action("a.fin")]);
    expect(applyTagFilter([i], m, [])).toEqual([i]);
  });

  it("keeps only matching actions inside an invocation and re-summarizes", () => {
    const i = inv([action("a.mkt", "FAILED"), action("a.fin", "SUCCEEDED")]);
    const [filtered] = applyTagFilter([i], m, ["marketing"]);
    expect(filtered?.actions.map((a) => a.target.full)).toEqual(["a.mkt"]);
    expect(filtered?.actionsTotal).toBe(1);
    expect(filtered?.actionsFailed).toBe(1);
  });

  it("drops invocations with zero matching actions", () => {
    const i = inv([action("a.fin")]);
    expect(applyTagFilter([i], m, ["marketing"])).toEqual([]);
  });

  it("excludes DECLARATION actions even when tag selection is permissive", () => {
    const i = inv([action("raw.x", "SUCCEEDED", "DECLARATION")]);
    expect(applyTagFilter([i], m, ["untagged"])).toEqual([]);
  });

  it("matches via untagged pseudo-tag", () => {
    const i = inv([action("a.untagged"), action("a.mkt")]);
    const [filtered] = applyTagFilter([i], m, ["untagged"]);
    expect(filtered?.actions.map((a) => a.target.full)).toEqual(["a.untagged"]);
  });
});

describe("parseTagsParam", () => {
  it("returns [] for missing or empty input", () => {
    expect(parseTagsParam(undefined)).toEqual([]);
    expect(parseTagsParam("")).toEqual([]);
  });
  it("splits comma-separated values and trims", () => {
    expect(parseTagsParam("marketing, daily , finance")).toEqual([
      "marketing",
      "daily",
      "finance",
    ]);
  });
  it("supports array form", () => {
    expect(parseTagsParam(["a", "b,c"])).toEqual(["a", "b", "c"]);
  });
});
