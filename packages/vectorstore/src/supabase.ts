import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  MetadataFilter,
  Observation,
  ObservationInput,
  Retrieved,
} from "@em/shared";
import type { VectorStore } from "./provider";

/**
 * Supabase / pgvector implementation of VectorStore.
 *
 * Uses the SERVICE ROLE key — this runs server-side only (Next.js route handlers,
 * the seed script, the MCP server). Never import this into client components.
 */
export class SupabaseVectorStore implements VectorStore {
  #db: SupabaseClient;

  constructor(
    url = process.env.SUPABASE_URL,
    serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  ) {
    if (!url || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    this.#db = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async save(
    input: ObservationInput & { embedding: number[]; embeddingModel: string },
  ): Promise<string> {
    const { data, error } = await this.#db
      .from("observations")
      .insert({
        type: input.type,
        title: input.title,
        content: input.content,
        tags: input.tags ?? [],
        technology: input.technology ?? [],
        repository: input.repository ?? null,
        language: input.language ?? null,
        source: input.source ?? null,
        source_ref: input.sourceRef ?? null,
        confidence: input.confidence ?? 0.5,
        // pgvector wants the literal form `[1,2,3]` (a string), not a JSON array.
        embedding: toPgVector(input.embedding),
        embedding_model: input.embeddingModel,
      })
      .select("id")
      .single();

    if (error) throw new Error(`save failed: ${error.message}`);
    return data.id as string;
  }

  async search(
    queryEmbedding: number[],
    opts: { topK: number; filter?: MetadataFilter },
  ): Promise<Retrieved[]> {
    const f = opts.filter ?? {};
    const { data, error } = await this.#db.rpc("match_observations", {
      query_embedding: toPgVector(queryEmbedding),
      match_count: opts.topK,
      filter_types: f.type ?? null,
      filter_tech: f.technology ?? null,
      filter_repo: f.repository ?? null,
      filter_language: f.language ?? null,
    });

    if (error) throw new Error(`search failed: ${error.message}`);
    return (data as DbRow[]).map((row) => ({
      observation: rowToObservation(row),
      score: row.similarity ?? 0,
    }));
  }

  async get(id: string): Promise<Observation | null> {
    const { data, error } = await this.#db
      .from("observations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`get failed: ${error.message}`);
    return data ? rowToObservation(data as DbRow) : null;
  }
}

/** Serialize a JS number[] into pgvector's text literal: `[0.1,0.2,...]`. */
function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}

/** Row shape returned by match_observations / select *. */
interface DbRow {
  id: string;
  type: Observation["type"];
  title: string;
  content: string;
  tags: string[];
  technology: string[];
  repository: string | null;
  language: string | null;
  source: string | null;
  source_ref: string | null;
  confidence: number;
  upvotes: number;
  embedding_model: string;
  created_at: string;
  last_used_at: string | null;
  similarity?: number;
}

function rowToObservation(row: DbRow): Observation {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    tags: row.tags,
    technology: row.technology,
    repository: row.repository ?? undefined,
    language: row.language ?? undefined,
    source: row.source ?? undefined,
    sourceRef: row.source_ref ?? undefined,
    confidence: row.confidence,
    upvotes: row.upvotes,
    embeddingModel: row.embedding_model,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}
