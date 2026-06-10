import { describe, expect, it } from "vitest";
import { rejectUnsafeMutation } from "./api-utils";

describe("rejectUnsafeMutation", () => {
  it("allows same-origin requests with the mutation header", () => {
    const req = new Request("http://localhost:3000/api/targets/t/invocations", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
        "x-sentinel-mutation": "1",
      },
    });

    expect(rejectUnsafeMutation(req)).toBeUndefined();
  });

  it("rejects requests without the mutation header", () => {
    const req = new Request("http://localhost:3000/api/targets/t/invocations", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
      },
    });

    expect(rejectUnsafeMutation(req)?.status).toBe(403);
  });

  it("rejects cross-origin browser requests", () => {
    const req = new Request("http://localhost:3000/api/targets/t/invocations", {
      method: "POST",
      headers: {
        origin: "https://example.com",
        "x-sentinel-mutation": "1",
      },
    });

    expect(rejectUnsafeMutation(req)?.status).toBe(403);
  });
});
