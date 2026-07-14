// The public surface of the RAG core. apps/web, the seeder, and (later) the MCP
// server import from here — one core, many interfaces.
export { type Rag, ragFromEnv } from "./factory";
export { addObservation } from "./addObservation";
export { reviewDiff, type ReviewOptions } from "./reviewDiff";
export { reflect, type Interaction } from "./reflect";
export { ask, type AskOptions } from "./ask";

// Re-export the shared domain types so consumers can import everything from @em/rag.
export type * from "@em/shared";
