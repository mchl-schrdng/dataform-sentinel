import { NextResponse } from "next/server";
import { getTarget } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { TargetConfig } from "@/lib/config";

export type ApiHandler<T> = (ctx: { target: TargetConfig; req: Request }) => Promise<T>;

export function rejectUnsafeMutation(req: Request): Response | undefined {
  const origin = req.headers.get("origin");
  const reqOrigin = new URL(req.url).origin;
  if (origin && origin !== reqOrigin) {
    return NextResponse.json({ error: "Cross-origin mutation blocked" }, { status: 403 });
  }

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    return NextResponse.json({ error: "Cross-site mutation blocked" }, { status: 403 });
  }

  if (req.headers.get("x-sentinel-mutation") !== "1") {
    return NextResponse.json({ error: "Missing mutation header" }, { status: 403 });
  }

  return undefined;
}

export async function withTarget<T>(
  req: Request,
  params: { targetKey: string },
  handler: ApiHandler<T>,
): Promise<Response> {
  const target = getTarget(params.targetKey);
  if (!target) {
    return NextResponse.json({ error: `Unknown target: ${params.targetKey}` }, { status: 404 });
  }
  try {
    const data = await handler({ target, req });
    if (data === undefined || data === null) return new NextResponse(null, { status: 204 });
    return NextResponse.json(data);
  } catch (err) {
    logger.error({ err, targetKey: target.key }, "API handler failed");
    const message = err instanceof Error ? err.message : "internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
