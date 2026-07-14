import { NextResponse } from "next/server";
import { addObservation, ragFromEnv } from "@em/rag";
import type { ObservationInput } from "@em/shared";

export const runtime = "nodejs";

/**
 * Persist an observation. Called when the user APPROVES a reflector chip — this is the
 * write half of the culture loop, gated on human approval.
 */
export async function POST(req: Request) {
  const input = (await req.json()) as ObservationInput;

  if (!input?.title || !input?.content) {
    return NextResponse.json({ error: "title and content required" }, { status: 400 });
  }

  try {
    const rag = ragFromEnv();
    const id = await addObservation(rag, input);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("save observation failed", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
