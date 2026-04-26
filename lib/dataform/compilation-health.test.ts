import { describe, expect, it } from "vitest";
import { computeCompilationHealth } from "./aggregations";
import type { CompilationResult } from "./types";

function comp(
  hoursAgo: number,
  failed: boolean,
  id = `c-${hoursAgo}`,
): CompilationResult {
  return {
    name: `projects/p/locations/l/repositories/r/compilationResults/${id}`,
    id,
    createTime: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    compilationErrors: failed
      ? [{ message: "boom", path: "definitions/foo.sqlx" }]
      : [],
  };
}

describe("computeCompilationHealth", () => {
  it("returns no_data on empty input", () => {
    expect(computeCompilationHealth([])).toEqual({
      kind: "no_data",
      failureCountInWindow: 0,
    });
  });

  it("returns healthy when every compilation succeeded", () => {
    const h = computeCompilationHealth([comp(1, false), comp(2, false)]);
    expect(h.kind).toBe("healthy");
    expect(h.failureCountInWindow).toBe(0);
    expect(h.lastSuccessfulAt).toBeDefined();
  });

  it("returns currently_broken when the most recent compilation failed", () => {
    const h = computeCompilationHealth([
      comp(1, true),
      comp(4, false),
      comp(8, false),
    ]);
    expect(h.kind).toBe("currently_broken");
    expect(h.failureCountInWindow).toBe(1);
    expect(h.lastSuccessfulAt).toBeDefined();
  });

  it("returns recently_broken when latest succeeded but earlier failed", () => {
    const h = computeCompilationHealth([
      comp(1, false),
      comp(3, true),
      comp(5, true),
    ]);
    expect(h.kind).toBe("recently_broken");
    expect(h.failureCountInWindow).toBe(2);
  });

  it("ignores chronological input order", () => {
    const h = computeCompilationHealth([
      comp(8, false),
      comp(1, true),
      comp(4, false),
    ]);
    expect(h.kind).toBe("currently_broken");
  });
});
