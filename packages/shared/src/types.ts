/**
 * Shared domain types — the vocabulary every package speaks.
 *
 * Keeping these in one dependency-free package means `embeddings`, `vectorstore`,
 * `llm`, and `rag` all agree on the shape of an Observation without importing each
 * other. This is what lets you swap any single implementation later.
 */

/**
 * The categories of engineering knowledge the system stores.
 * Mirrors the `obs_type` enum in schema.sql — keep them in sync.
 */
export type ObservationType =
  | "observation" // a raw lesson learned
  | "best_practice" // a rule you'd apply again
  | "adr" // architecture decision record
  | "pattern" // a reusable solution shape
  | "incident" // something that broke + the fix
  | "security" // a security-relevant note
  | "performance" // a perf-relevant note
  | "team_standard"; // a convention (style, docs, naming)

/**
 * What the user (or the reflector) writes. No id, no embedding yet — those are
 * assigned when it's persisted.
 */
export interface ObservationInput {
  type: ObservationType;
  title: string;
  /** The actual learning. THIS is the text that gets embedded and retrieved. */
  content: string;
  tags?: string[];
  /** e.g. ['react','hooks'] — used to metadata-filter BEFORE the vector search. */
  technology?: string[];
  /** e.g. 'spendwise', 'expense-tracker-pro'. */
  repository?: string;
  language?: string; // 'ts' | 'js' | 'sql' ...
  source?: string; // 'personal-note' | 'pr-review' | 'incident' | 'reflector'
  sourceRef?: string; // optional URL or PR number
  confidence?: number; // 0..1
}

/** A persisted observation as it comes back from the store. */
export interface Observation extends ObservationInput {
  id: string;
  embeddingModel: string; // which model produced the vector — migration insurance
  upvotes: number;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * A search hit: the observation plus WHY it was retrieved.
 * `score` powers the "Why retrieved" explainability panel in the UI.
 */
export interface Retrieved {
  observation: Observation;
  /** Cosine similarity in [0,1] (1 - cosine distance). Higher = closer. */
  score: number;
}

/** Narrow the candidate set before the kNN search. */
export interface MetadataFilter {
  type?: ObservationType[];
  technology?: string[]; // matches if the row shares ANY of these
  repository?: string;
  language?: string;
}

/** One turn in a chat with the LLM. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOpts {
  /** Overrides the provider's default model for this one call (e.g. use haiku for a cheap prep call). */
  model?: string;
  maxTokens?: number;
}

/** The result of a Review turn, ready to render. */
export interface ReviewResult {
  /** The human-readable review text (markdown). */
  review: string;
  /** The observations the reviewer was given, with scores — for the "Why retrieved" panel. */
  retrieved: Retrieved[];
  /** Candidate observations the reflector proposes saving. User approves before they persist. */
  proposals: ObservationInput[];
}
