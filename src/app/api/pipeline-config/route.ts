import { NextResponse } from "next/server";

import {
  readPipelineConfig,
  writePipelineConfig,
} from "../../../../agent/lib/store";
import { inRequestWorkspace } from "../../../../agent/lib/workspace";
import type { PipelineConfig } from "../../../../agent/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return inRequestWorkspace(request, async () => {
    const config = await readPipelineConfig();
    return NextResponse.json({ config });
  });
}

export async function PUT(request: Request) {
  return inRequestWorkspace(request, async () => {
    const body = (await request.json()) as PipelineConfig;
    const config = await writePipelineConfig(body);
    return NextResponse.json({ config });
  });
}
