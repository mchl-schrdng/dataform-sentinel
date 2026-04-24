import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvocation, listInvocations } from "@/lib/dataform";
import { withTarget } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  compilationResultName: z.string().optional(),
  includedTargets: z.array(z.string()).optional(),
});

export async function GET(
  req: Request,
  ctx: { params: Promise<{ targetKey: string }> },
) {
  const { targetKey } = await ctx.params;
  return withTarget(req, { targetKey }, async ({ target }) => {
    const url = new URL(req.url);
    const pageToken = url.searchParams.get("pageToken") ?? undefined;
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25") || 25;
    return listInvocations(target, pageToken, pageSize);
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ targetKey: string }> },
) {
  const { targetKey } = await ctx.params;
  return withTarget(req, { targetKey }, async ({ target }) => {
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return createInvocation(target, parsed.data);
  });
}
