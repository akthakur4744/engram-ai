import type { ObservationInput } from "@em/shared";
import type { Rag } from "./factory";

/**
 * The WRITE half of the culture loop: embed an observation and persist it.
 *
 * Used by (a) the manual "Add Observation" form, (b) the seeder, and (c) the
 * reflector when the user approves a proposed observation. All three converge here
 * so an observation is embedded and stored exactly one way.
 */
export async function addObservation(rag: Rag, input: ObservationInput): Promise<string> {
  const embedding = await rag.embeddings.embed(embedText(input));
  return rag.store.save({
    ...input,
    embedding,
    embeddingModel: rag.embeddings.model,
  });
}

/**
 * What text do we embed? Title + content. Including the title gives the vector a bit
 * of the "headline" signal, which measurably helps retrieval on short queries.
 */
function embedText(o: ObservationInput): string {
  return `${o.title}\n\n${o.content}`;
}
