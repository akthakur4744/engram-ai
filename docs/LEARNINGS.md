# Learnings

A log of engineering decisions and gotchas from building Engram AI — distilled, dated in spirit, and reasoned, the same way the app itself stores `observations`. This is about the codebase's own history, not a personal-learning-project framing.

## 1. Embeddings SDK: `@google/generative-ai` → `@google/genai`

**Problem:** The initial embeddings implementation targeted `@google/generative-ai` (the legacy Google SDK) with a plan to truncate `gemini-embedding-001`'s native 3072-dim output to 768 via `outputDimensionality` (a Matryoshka embedding model supports this). That SDK's `EmbedContentRequest` type doesn't expose `outputDimensionality` at all — the code failed to typecheck.

**Resolution:** Switched to `@google/genai` (the current Google GenAI SDK), whose `embedContent()` accepts `config: { taskType, outputDimensionality }` and returns `embeddings: ContentEmbedding[]`. Same provider interface on the `packages/rag` side — nothing downstream changed.

**Files:** `packages/embeddings/src/gemini.ts`, `packages/embeddings/package.json`.

## 2. `temperature` rejected by current-tier Claude models

**Problem:** `ClaudeLLMProvider` originally sent `temperature` on every `messages.create()` / `.stream()` call. Current-tier models return `400 invalid_request_error: \`temperature\` is deprecated for this model`. This is a runtime API validation, not a TypeScript type error, so `pnpm typecheck` passed clean — the bug only surfaced when the review pipeline was exercised live in the browser.

**Resolution:** Removed `temperature` entirely from `LLMOpts` and every call site, rather than conditionally sending it per model tier.

**Files:** `packages/llm/src/claude.ts`, `packages/shared/src/types.ts`, `packages/rag/src/reviewDiff.ts`, `packages/rag/src/reflect.ts`.

## 3. Quality-tier model: Opus 4.8 → Sonnet 4.6

**Decision:** Switched `Models.quality` from `claude-opus-4-8` to `claude-sonnet-4-6` to reduce cost on the higher-volume user-facing review/answer calls, keeping `claude-haiku-4-5` as the cheap prep tier.

**File:** `packages/llm/src/provider.ts`.

## 4. Metadata pre-filter before kNN

**Decision:** `match_observations()` applies `type`/`technology`/`repository`/`language` filters in the SQL `WHERE` clause _before_ ranking by vector distance, instead of filtering the top-K results after retrieval.

**Why it matters:** A smaller candidate set going into the vector search is both faster and more accurate — narrowing to a technology or repo first means the top-K slots aren't wasted on irrelevant-domain matches.

**File:** `packages/vectorstore/src/schema.sql`.

## 5. `embedding_model` column as migration insurance

**Decision:** Every `observations` row records which embedding model produced its vector.

**Why it matters:** If the embedding provider is swapped later (e.g., Gemini → a Cloudflare Qwen3 provider), this column identifies exactly which rows need re-embedding, instead of re-embedding the entire table blind.

**Files:** `packages/vectorstore/src/schema.sql`, `packages/rag/src/addObservation.ts`.

## 6. Two-tier Claude usage

**Decision:** `Models.cheap` (haiku) handles the prep calls that run at least twice per review (query derivation, reflection); `Models.quality` (sonnet) is reserved for the single generation the user actually reads.

**Why it matters:** Cost scales with the cheap tier; quality is spent where it's seen.

**Files:** `packages/llm/src/provider.ts`, `packages/rag/src/reviewDiff.ts`.

## 7. Embeddings and generation are decoupled by design

**Decision:** `EmbeddingProvider` and `LLMProvider` are separate interfaces. The LLM never receives a vector — only retrieved text.

**Why it matters:** Anthropic doesn't ship an embedding model, so pairing a generation-only model with a dedicated embedding provider is the standard production pattern, not a workaround. It also keeps retrieval swappable independent of generation.

**File:** `packages/rag/src/factory.ts`.

## 8. MCP server lives in the monorepo, not a separate service

**Decision:** `apps/mcp-server` imports `@em/rag` directly and runs over stdio, in-process, rather than as an independently deployed service reached over a network boundary.

**Why it matters:** `@modelcontextprotocol/sdk` is a library, not a hosting requirement. Keeping the MCP server in-repo is the concrete proof that the web app and the MCP server share one core with zero duplication.

**Files:** `apps/mcp-server/src/index.ts`, `.claude/rules/architecture.md`.

## 9. Next.js 15 over an older pinned version

**Decision:** `apps/web` targets Next.js 15 (App Router, React 19).

**Why it matters:** There was no existing production constraint forcing an older React/Next version, so the project started on the current major rather than an older LTS-feeling one.

**File:** `apps/web/package.json`.

## Related Docs

- [docs/ARCHITECTURE.md](ARCHITECTURE.md) — the system these decisions produced.
- [README.md](../README.md) — pitch, demo walkthrough, setup, roadmap.
