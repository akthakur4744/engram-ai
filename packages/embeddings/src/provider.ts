/**
 * EmbeddingProvider — turns text into a vector.
 *
 * This is the ONLY thing the rest of the system knows about embeddings. Swap Gemini
 * for Cloudflare/OpenAI later by writing another class that satisfies this interface;
 * nothing in `rag` or `vectorstore` changes.
 *
 * Note the deliberate decoupling: the LLM (Claude) never sees these vectors. It only
 * ever receives retrieved *text*. Embeddings are for search; the LLM is for reasoning.
 */
export interface EmbeddingProvider {
  /** Embed a single piece of text. Returns a `dimensions`-length vector. */
  embed(text: string): Promise<number[]>;

  /** Embed many texts in one call where the backend supports it (used by the seeder). */
  embedBatch(texts: string[]): Promise<number[][]>;

  /** e.g. 'gemini-embedding-001'. Stored on every row so we know what to re-embed on a migration. */
  readonly model: string;

  /** e.g. 768. Must match the `vector(N)` column width in schema.sql. */
  readonly dimensions: number;
}
