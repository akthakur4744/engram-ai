import { NextResponse } from "next/server";
import { ragFromEnv, reviewDiff } from "@em/rag";
import type { MetadataFilter } from "@em/shared";
import { fetchPRDiff, parsePRUrl } from "@/lib/github";

// Node runtime: the Anthropic/Supabase SDKs aren't Edge-compatible.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { prUrl, filter } = (await req.json()) as {
    prUrl?: string;
    filter?: MetadataFilter;
  };

  if (!prUrl) {
    return NextResponse.json({ error: "Provide a PR URL" }, { status: 400 });
  }

  try {
    const { owner, repo, number } = parsePRUrl(prUrl);
    const diff = await fetchPRDiff(owner, repo, number);
    const rag = ragFromEnv();
    const result = await reviewDiff(rag, diff, { filter: filter ?? { repository: repo } });
    // reviewDiff truncates the diff to 12000 chars internally (packages/rag/src/reviewDiff.ts)
    // before generating the review — surface that here since the user never sees the raw diff.
    const truncated = diff.length > 12000;
    return NextResponse.json({ ...result, truncated });
  } catch (err) {
    console.error("PR review failed", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
