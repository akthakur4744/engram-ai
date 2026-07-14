# Architecture constraints

## One core, many interfaces

All RAG pipeline logic lives in `packages/rag`. Consumers (`apps/web`, `apps/mcp-server`, seed script) import from `@em/rag` and call the exported functions — they do not reimplement retrieval or generation.

## Thin wrappers only

API routes and MCP tools must be thin:

```typescript
const rag = ragFromEnv();
const result = await reviewDiff(rag, diff, { filter });
return result;
```

No business logic in route handlers or MCP tool handlers.

## Provider wiring

Concrete provider choices (Gemini, Supabase, Claude) are named **only** in `packages/rag/src/factory.ts` via `ragFromEnv()`. To swap a backend, change factory.ts — the pipeline is unchanged.

## Package dependency direction

```
shared  ←  embeddings, llm, vectorstore  ←  rag  ←  apps/*
```

`shared` has zero dependencies. Provider packages depend only on `shared`. `rag` composes providers. Apps depend on `rag`.

## Embeddings vs LLM

Embeddings are for search; the LLM is for reasoning. They never touch each other. The LLM only sees retrieved **text**, never vectors.

## Two-tier Claude

- `claude-haiku-4-5` — cheap prep calls (derive query, reflect)
- `claude-opus-4-8` — user-facing review and answers
