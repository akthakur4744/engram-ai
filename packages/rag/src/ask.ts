import { Models } from "@em/llm";
import type { MetadataFilter, Retrieved } from "@em/shared";
import type { Rag } from "./factory";

export interface AskOptions {
  topK?: number;
  filter?: MetadataFilter;
}

/**
 * Free-form Q&A grounded in the shared memory (Milestone 2).
 *
 * Retrieval is separated from generation so the caller can render the "Why retrieved"
 * panel from `retrieved` while streaming the answer token-by-token. Returns the hits
 * plus an async iterable of answer chunks.
 */
export async function ask(
  rag: Rag,
  question: string,
  opts: AskOptions = {},
): Promise<{ retrieved: Retrieved[]; stream: AsyncIterable<string> }> {
  const queryEmbedding = await rag.embeddings.embed(question);
  const retrieved = await rag.store.search(queryEmbedding, {
    topK: opts.topK ?? 5,
    filter: opts.filter,
  });

  const stream = rag.llm.stream(
    [
      { role: "system", content: ASK_SYSTEM },
      { role: "user", content: buildAskPrompt(question, retrieved) },
    ],
    { model: Models.quality, maxTokens: 1200 },
  );

  return { retrieved, stream };
}

const ASK_SYSTEM = `You answer engineering questions using a shared memory of observations.
You are given the question and numbered RETRIEVED OBSERVATIONS. Ground your answer in them
and cite as [#n]. If the memory lacks the answer, say so and answer from general knowledge,
clearly marking which parts are not backed by the memory.`;

function buildAskPrompt(question: string, retrieved: Retrieved[]): string {
  const context =
    retrieved.length === 0
      ? "(none)"
      : retrieved
          .map((r, i) => `[#${i + 1}] ${r.observation.title}: ${r.observation.content}`)
          .join("\n");
  return `RETRIEVED OBSERVATIONS:\n${context}\n\nQUESTION: ${question}`;
}
