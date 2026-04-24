import { NextResponse } from "next/server";
import { cancelInvocation, getInvocation } from "@/lib/dataform";
import { withTarget } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ targetKey: string; invocationId: string }> },
) {
  const { targetKey, invocationId } = await ctx.params;
  return withTarget(req, { targetKey }, async ({ target }) => {
    const inv = await getInvocation(target, invocationId);
    if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });
    return inv;
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ targetKey: string; invocationId: string }> },
) {
  const { targetKey, invocationId } = await ctx.params;
  return withTarget(req, { targetKey }, async ({ target }) => {
    await cancelInvocation(target, invocationId);
    return { status: "cancelled" };
  });
}
