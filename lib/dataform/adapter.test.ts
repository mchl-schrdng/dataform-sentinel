import { describe, expect, it } from "vitest";
import { adaptCompilationResultAction, adaptInvocationAction } from "./adapter";

describe("adaptCompilationResultAction", () => {
  it("extracts tags, canonical type, and dependency targets", () => {
    const { target, compiled } = adaptCompilationResultAction({
      canonicalTarget: { database: "p", schema: "analytics", name: "orders" },
      relation: {
        relationType: "TABLE",
        tags: ["daily"],
        dependencyTargets: [
          { database: "p", schema: "raw", name: "orders" },
          { database: "p", schema: "staging", name: "orders" },
        ],
      },
    });

    expect(target.full).toBe("p.analytics.orders");
    expect(compiled.type).toBe("TABLE");
    expect(compiled.tags).toEqual(["daily"]);
    expect(compiled.dependencyTargets).toEqual(["p.raw.orders", "p.staging.orders"]);
  });
});

describe("adaptInvocationAction", () => {
  it("preserves live action states and overlays compilation metadata", () => {
    const action = adaptInvocationAction(
      {
        canonicalTarget: { database: "p", schema: "analytics", name: "orders" },
        state: "PENDING",
        bigqueryAction: { sqlScript: "select 1" },
      },
      {
        tags: ["daily"],
        type: "INCREMENTAL_TABLE",
        dependencyTargets: ["p.raw.orders"],
      },
    );

    expect(action.state).toBe("PENDING");
    expect(action.type).toBe("INCREMENTAL_TABLE");
    expect(action.dependencyTargets).toEqual(["p.raw.orders"]);
    expect(action.compiledSql).toBe("select 1");
  });
});
