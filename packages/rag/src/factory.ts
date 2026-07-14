import { GeminiEmbeddingProvider, type EmbeddingProvider } from "@em/embeddings";
import { ClaudeLLMProvider, type LLMProvider } from "@em/llm";
import { SupabaseVectorStore, type VectorStore } from "@em/vectorstore";

/**
 * The three collaborators the RAG pipeline needs, bundled together.
 *
 * Everything downstream (reviewDiff, ask, reflect, addObservation) takes a `Rag`
 * and calls only the interfaces — never the concrete Gemini/Supabase/Claude classes.
 * That's the whole point of the abstraction: `fromEnv()` is the ONLY place the
 * concrete choices are named. Swap a provider here and the pipeline is unchanged.
 */
export interface Rag {
  embeddings: EmbeddingProvider;
  store: VectorStore;
  llm: LLMProvider;
}

/** Build the default stack from environment variables (server-side only). */
export function ragFromEnv(): Rag {
  return {
    embeddings: new GeminiEmbeddingProvider(),
    store: new SupabaseVectorStore(),
    llm: new ClaudeLLMProvider(),
  };
}
