import type {
  MetadataFilter,
  Observation,
  ObservationInput,
  Retrieved,
} from "@em/shared";

/**
 * VectorStore — persistence + similarity search over observations.
 *
 * The `rag` core depends only on this interface. Today it's Supabase/pgvector; you
 * could implement the same three methods against Pinecone, Qdrant, or an in-memory
 * store for tests without touching anything upstream.
 */
export interface VectorStore {
  /** Persist an observation together with its precomputed embedding. Returns the new id. */
  save(
    input: ObservationInput & { embedding: number[]; embeddingModel: string },
  ): Promise<string>;

  /**
   * k-nearest-neighbour search.
   *
   * The KEY production detail: `filter` is applied BEFORE the vector search (a WHERE
   * clause on indexed metadata columns), so kNN runs over a smaller, more relevant set.
   * This is faster AND more accurate than filtering after retrieval.
   */
  search(
    queryEmbedding: number[],
    opts: { topK: number; filter?: MetadataFilter },
  ): Promise<Retrieved[]>;

  /** Fetch a single observation by id (used to render citations in a review). */
  get(id: string): Promise<Observation | null>;
}
