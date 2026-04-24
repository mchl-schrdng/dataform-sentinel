import { NextResponse } from "next/server";
import { getTarget } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { TargetConfig } from "@/lib/config";

export type ApiHandler<T> = (ctx: { target: TargetConfig; req: Request }) => Promise<T>;

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
