import { NextResponse } from "next/server";
import { ragFromEnv, reviewDiff } from "@em/rag";
import type { MetadataFilter } from "@em/shared";

// Node runtime: the Anthropic/Supabase SDKs aren't Edge-compatible.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { diff, filter } = (await req.json()) as {
    diff?: string;
    filter?: MetadataFilter;
  };

  if (!diff || diff.trim().length < 10) {
    return NextResponse.json({ error: "Provide a diff" }, { status: 400 });
  }

  try {
    const rag = ragFromEnv();
    const result = await reviewDiff(rag, diff, { filter });
    return NextResponse.json(result);
  } catch (err) {
    console.error("review failed", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
