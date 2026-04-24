import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvocation } from "@/lib/dataform";
import { withTarget } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  target: z.string().min(1),
  compilationResultName: z.string().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ targetKey: string }> },
) {
  const { targetKey } = await ctx.params;
  return withTarget(req, { targetKey }, async ({ target }) => {
    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return createInvocation(target, {
      compilationResultName: parsed.data.compilationResultName,
      includedTargets: [parsed.data.target],
    });
  });
}
