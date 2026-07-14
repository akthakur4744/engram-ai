/**
 * Engram AI MCP server — exposes the RAG core as harness Memory tools.
 *
 * Run: pnpm mcp  (or pnpm --filter @em/mcp-server dev)
 * Register in Cursor: .cursor/mcp.json
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  addObservation,
  ask,
  ragFromEnv,
  reflect,
  reviewDiff,
  type Interaction,
} from "@em/rag";
import type { MetadataFilter, ObservationInput, ObservationType, Retrieved } from "@em/shared";
import { distillVerifyFailure } from "./distillVerifyFailure";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const observationTypeSchema = z.enum([
  "observation",
  "best_practice",
  "adr",
  "pattern",
  "incident",
  "security",
  "performance",
  "team_standard",
]);

const metadataFilterSchema = z
  .object({
    type: z.array(observationTypeSchema).optional(),
    technology: z.array(z.string()).optional(),
    repository: z.string().optional(),
    language: z.string().optional(),
  })
  .optional();

function textResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function createServer(): McpServer {
  const server = new McpServer({
    name: "engram-ai",
    version: "0.1.0",
  });

  const rag = ragFromEnv();

  server.registerTool(
    "search_observations",
    {
      description:
        "Search the shared engineering memory for observations relevant to a query. " +
        "Use before implementing to retrieve team lessons and conventions.",
      inputSchema: {
        query: z.string().describe("Natural-language search query"),
        topK: z.number().int().min(1).max(20).optional().describe("Max results (default 5)"),
        filter: metadataFilterSchema.describe("Optional metadata pre-filter"),
      },
    },
    async ({ query, topK, filter }) => {
      const embedding = await rag.embeddings.embed(query);
      const retrieved = await rag.store.search(embedding, {
        topK: topK ?? 5,
        filter: filter as MetadataFilter | undefined,
      });
      return textResult(
        retrieved.map((r: Retrieved, i: number) => ({
          rank: i + 1,
          score: r.score,
          id: r.observation.id,
          type: r.observation.type,
          title: r.observation.title,
          content: r.observation.content,
          technology: r.observation.technology,
          tags: r.observation.tags,
        })),
      );
    },
  );

  server.registerTool(
    "review_diff",
    {
      description:
        "Review a git diff using retrieved observations. Returns review text with [#n] citations, " +
        "retrieved observations, and reflector proposals (not persisted until approved).",
      inputSchema: {
        diff: z.string().describe("Git diff to review"),
        topK: z.number().int().min(1).max(20).optional(),
        filter: metadataFilterSchema,
      },
    },
    async ({ diff, topK, filter }) => {
      const result = await reviewDiff(rag, diff, { topK, filter: filter as MetadataFilter });
      return textResult(result);
    },
  );

  server.registerTool(
    "ask",
    {
      description:
        "Ask an engineering question grounded in the shared memory. Returns answer with citations.",
      inputSchema: {
        question: z.string().describe("Engineering question"),
        topK: z.number().int().min(1).max(20).optional(),
        filter: metadataFilterSchema,
      },
    },
    async ({ question, topK, filter }) => {
      const { retrieved, stream } = await ask(rag, question, {
        topK,
        filter: filter as MetadataFilter,
      });
      let answer = "";
      for await (const chunk of stream) {
        answer += chunk;
      }
      return textResult({ answer, retrieved });
    },
  );

  server.registerTool(
    "reflect",
    {
      description:
        "Propose new observations distilled from a review or Q&A interaction. " +
        "Returns proposals only — human must approve via add_observation before they persist.",
      inputSchema: {
        diff: z.string().optional().describe("Git diff from the interaction"),
        review: z.string().optional().describe("Review text from review_diff"),
        question: z.string().optional().describe("Question from ask"),
        answer: z.string().optional().describe("Answer from ask"),
      },
    },
    async ({ diff, review, question, answer }) => {
      const turn: Interaction = { diff, review, question, answer };
      const proposals = await reflect(rag, turn);
      return textResult({
        proposals,
        note: "These are proposals only. Call add_observation to persist after human approval.",
      });
    },
  );

  server.registerTool(
    "add_observation",
    {
      description:
        "Persist an approved observation to the shared memory. Only call after human approval " +
        "(e.g. after reviewing reflect proposals).",
      inputSchema: {
        type: observationTypeSchema,
        title: z.string(),
        content: z.string(),
        tags: z.array(z.string()).optional(),
        technology: z.array(z.string()).optional(),
        repository: z.string().optional(),
        language: z.string().optional(),
        source: z.string().optional(),
        sourceRef: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
      },
    },
    async (input) => {
      const observation: ObservationInput = {
        type: input.type as ObservationType,
        title: input.title,
        content: input.content,
        tags: input.tags,
        technology: input.technology,
        repository: input.repository,
        language: input.language,
        source: input.source ?? "mcp",
        sourceRef: input.sourceRef,
        confidence: input.confidence ?? 0.8,
      };
      const id = await addObservation(rag, observation);
      return textResult({ id, saved: observation });
    },
  );

  server.registerTool(
    "distill_verify_failure",
    {
      description:
        "Distill a failed pnpm verify run into incident-type observation proposals. " +
        "Does NOT persist — returns proposals for human approval via add_observation.",
      inputSchema: {
        verifyOutput: z
          .string()
          .describe("Stdout/stderr from a failed pnpm verify or typecheck run"),
      },
    },
    async ({ verifyOutput }) => {
      const proposals = await distillVerifyFailure(rag, verifyOutput);
      return textResult({
        proposals,
        note: "Incident proposals from verify failure. Approve good ones via add_observation.",
      });
    },
  );

  return server;
}

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("engram-ai MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
