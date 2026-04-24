import { rerunInvocation } from "@/lib/dataform";
import { withTarget } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ targetKey: string; invocationId: string }> },
) {
  const { targetKey, invocationId } = await ctx.params;
  return withTarget(req, { targetKey }, async ({ target }) => {
    const url = new URL(req.url);
    const onlyFailed = url.searchParams.get("onlyFailed") === "true";
    return rerunInvocation(target, invocationId, { onlyFailed });
  });
}
