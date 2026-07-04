import { NextResponse } from "next/server";

import {
  readPipelineConfig,
  writePipelineConfig,
} from "../../../../agent/lib/store";
import type { PipelineConfig } from "../../../../agent/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await readPipelineConfig();
  return NextResponse.json({ config });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as PipelineConfig;
  const config = await writePipelineConfig(body);
  return NextResponse.json({ config });
}
