import { GoogleGenAI } from "@google/genai";
import type { EmbeddingProvider } from "./provider";

const MODEL = "gemini-embedding-001";

/**
 * Google Gemini embeddings — the free-tier default (1,500 req/day, no card).
 *
 * `gemini-embedding-001` natively outputs 3072 dims but is a *Matryoshka* model:
 * ask for a shorter vector (`outputDimensionality`) and the leading N values are
 * still a valid embedding. We truncate to 768 to keep the pgvector column small and
 * the HNSW index fast. When you truncate below the native size, Google recommends
 * re-normalizing to unit length — `normalize()` does that so cosine distance behaves.
 */
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly model = MODEL;
  readonly dimensions: number;
  #ai: GoogleGenAI;

  constructor(apiKey = process.env.GOOGLE_API_KEY, dimensions = 768) {
    if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");
    this.dimensions = dimensions;
    this.#ai = new GoogleGenAI({ apiKey });
  }

  async embed(text: string): Promise<number[]> {
    const [vec] = await this.embedBatch([text]);
    if (!vec) throw new Error("embedding failed: empty response");
    return vec;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await this.#ai.models.embedContent({
      model: MODEL,
      contents: texts,
      config: {
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: this.dimensions,
      },
    });
    const embeddings = res.embeddings ?? [];
    return embeddings.map((e) => normalize(e.values ?? [], this.dimensions));
  }
}

/**
 * When embedding a *query* (vs a stored document), Gemini quality improves if you tag
 * it as a query. Left as a learning hook — asymmetric query/document embeddings are a
 * real retrieval-quality lever; the POC uses the document-side embedding for both.
 */
export async function embedQuery(
  provider: GeminiEmbeddingProvider,
  text: string,
): Promise<number[]> {
  return provider.embed(text);
}

/** L2-normalize to unit length so cosine distance == dot-product distance. */
function normalize(v: number[], dims: number): number[] {
  const out = v.slice(0, dims);
  const mag = Math.sqrt(out.reduce((s, x) => s + x * x, 0));
  return mag === 0 ? out : out.map((x) => x / mag);
}
