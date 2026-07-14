import { Models } from "@em/llm";
import type { MetadataFilter, Retrieved, ReviewResult } from "@em/shared";
import type { Rag } from "./factory";
import { reflect } from "./reflect";

export interface ReviewOptions {
  topK?: number;
  /** Optional narrowing — e.g. the user says this diff is in the `spendwise` repo. */
  filter?: MetadataFilter;
}

/**
 * The killer demo, end to end:
 *
 *   diff ──▶ (haiku) derive a retrieval query
 *        ──▶ (gemini) embed the query
 *        ──▶ (pgvector) kNN retrieve top-K observations   ← the READ side of culture
 *        ──▶ (opus) write a review that CITES them by id
 *        ──▶ (haiku) reflect: propose new observations     ← the WRITE side of culture
 *
 * The two culture halves in one call: it reads what you've learned before, and it
 * proposes what to remember from this diff.
 */
export async function reviewDiff(
  rag: Rag,
  diff: string,
  opts: ReviewOptions = {},
): Promise<ReviewResult> {
  const topK = opts.topK ?? 5;

  // 1. Cheap prep call: turn a noisy diff into a focused search query.
  const query = await deriveQuery(rag, diff);

  // 2. Retrieve prior observations. Metadata pre-filter (if any) runs BEFORE kNN.
  const queryEmbedding = await rag.embeddings.embed(query);
  const retrieved = await rag.store.search(queryEmbedding, { topK, filter: opts.filter });

  // 3. Quality call: the review that grounds itself in the retrieved observations.
  const review = await rag.llm.generate(
    [
      { role: "system", content: REVIEW_SYSTEM },
      { role: "user", content: buildReviewPrompt(diff, retrieved) },
    ],
    { model: Models.quality, maxTokens: 1500 },
  );

  // 4. The culture loop's write proposals (user approves before anything persists).
  const proposals = await reflect(rag, { diff, review });

  return { review, retrieved, proposals };
}

/** Ask the cheap model for a short retrieval query distilled from the diff. */
async function deriveQuery(rag: Rag, diff: string): Promise<string> {
  const q = await rag.llm.generate(
    [
      {
        role: "system",
        content:
          "You turn a git diff into a short search query (max 12 words) capturing the " +
          "engineering concerns it raises (e.g. 'react derived state useEffect', " +
          "'node error handling async'). Reply with ONLY the query.",
      },
      { role: "user", content: truncate(diff, 6000) },
    ],
    { model: Models.cheap, maxTokens: 40, temperature: 0 },
  );
  return q.trim();
}

const REVIEW_SYSTEM = `You are a senior code reviewer for a team that keeps a shared memory of engineering observations.
You are given a git diff and a numbered list of RETRIEVED OBSERVATIONS from that memory.
Write a concise, actionable review of the diff. When a point is backed by an observation,
cite it inline as [#n] using its number. Do not invent observations; only cite ones provided.
If none apply, review on general merit and say the memory had nothing relevant.`;

function buildReviewPrompt(diff: string, retrieved: Retrieved[]): string {
  const context =
    retrieved.length === 0
      ? "(none)"
      : retrieved
          .map(
            (r, i) =>
              `[#${i + 1}] (${r.observation.type}, score ${r.score.toFixed(2)}) ` +
              `${r.observation.title}: ${r.observation.content}`,
          )
          .join("\n");

  return `RETRIEVED OBSERVATIONS:\n${context}\n\nDIFF:\n${truncate(diff, 12000)}`;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + "\n…(truncated)";
}
