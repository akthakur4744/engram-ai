import { Models } from "@em/llm";
import type { ObservationInput, ObservationType } from "@em/shared";
import type { Rag } from "./factory";

/** What the reflector looked at. Either a review turn or an ask turn. */
export interface Interaction {
  diff?: string;
  review?: string;
  question?: string;
  answer?: string;
}

/**
 * The REFLECTOR — the differentiator from generic "chat with docs" RAG.
 *
 * After a review or answer, a cheap LLM pass distills the interaction into candidate
 * observations worth remembering. It does NOT write them: it returns proposals the UI
 * shows as chips ("Save observation: …? [Save] [Dismiss]"). Only user-approved chips
 * are persisted (via addObservation). Approval is what keeps the shared memory
 * trustworthy — the system proposes, the human curates.
 */
export async function reflect(rag: Rag, turn: Interaction): Promise<ObservationInput[]> {
  const raw = await rag.llm.generate(
    [
      { role: "system", content: REFLECT_SYSTEM },
      { role: "user", content: renderTurn(turn) },
    ],
    { model: Models.cheap, maxTokens: 700, temperature: 0.2 },
  );
  return parseProposals(raw);
}

const REFLECT_SYSTEM = `You extract reusable engineering lessons from a code review or Q&A.
Return 0-3 candidate observations, ONLY as a JSON array (no prose, no markdown fence).
Each item: {"type","title","content","technology","tags"}.
- type: one of observation | best_practice | adr | pattern | incident | security | performance | team_standard
- title: <= 8 words
- content: one or two sentences, generalized (not tied to this exact file)
- technology: array of lowercase tags like ["react","hooks"]
- tags: array of short keywords
Only propose lessons that are genuinely reusable. If nothing is worth saving, return [].`;

function renderTurn(t: Interaction): string {
  const parts: string[] = [];
  if (t.diff) parts.push(`DIFF:\n${t.diff.slice(0, 8000)}`);
  if (t.review) parts.push(`REVIEW:\n${t.review}`);
  if (t.question) parts.push(`QUESTION:\n${t.question}`);
  if (t.answer) parts.push(`ANSWER:\n${t.answer}`);
  return parts.join("\n\n");
}

const VALID_TYPES: ReadonlySet<string> = new Set<ObservationType>([
  "observation", "best_practice", "adr", "pattern",
  "incident", "security", "performance", "team_standard",
]);

/** Parse the model's JSON, tolerating stray fences, and keep only well-formed items. */
function parseProposals(raw: string): ObservationInput[] {
  const json = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return []; // reflection is best-effort; never fail a review because JSON was malformed
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item): ObservationInput[] => {
    if (typeof item !== "object" || item === null) return [];
    const o = item as Record<string, unknown>;
    if (typeof o.title !== "string" || typeof o.content !== "string") return [];
    const type = (typeof o.type === "string" && VALID_TYPES.has(o.type)
      ? o.type
      : "observation") as ObservationType;
    return [
      {
        type,
        title: o.title,
        content: o.content,
        technology: toStringArray(o.technology),
        tags: toStringArray(o.tags),
        source: "reflector",
        confidence: 0.4, // proposals start low-confidence until a human blesses them
      },
    ];
  });
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
