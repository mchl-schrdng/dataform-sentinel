import { NextResponse } from "next/server";
import { ConfigLoadError, getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getConfig();
    return NextResponse.json({
      status: "ok",
      configLoaded: true,
      targetsCount: config.targets.length,
    });
  } catch (err) {
    if (err instanceof ConfigLoadError) {
      return NextResponse.json(
        { status: "degraded", configLoaded: false, error: err.message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { status: "error", configLoaded: false, error: "unknown" },
      { status: 500 },
    );
  }
}
