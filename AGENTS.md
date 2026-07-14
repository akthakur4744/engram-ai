# Engram AI — Agent Instructions

Cross-tool harness context for agents (Cursor, Claude Code, etc.) working in this repo.

## What this project is

A RAG + Agent Culture POC: engineers contribute distilled observations; every code review, Q&A, or PR analysis retrieves and cites them. The **reflector** write-back loop is the differentiator — the system learns from approved observations.

## Monorepo layout

```
engram-ai/
├── apps/
│   ├── web/              Next.js 15 — UI (/review) + thin API routes
│   └── mcp-server/       MCP server exposing @em/rag tools (Milestone 4)
├── packages/
│   ├── shared/           Domain types (Observation, Retrieved, MetadataFilter)
│   ├── embeddings/       EmbeddingProvider + GeminiEmbeddingProvider
│   ├── vectorstore/      VectorStore + SupabaseVectorStore + schema.sql
│   ├── llm/              LLMProvider + ClaudeLLMProvider (haiku + opus tiers)
│   └── rag/              THE CORE: reviewDiff · ask · reflect · addObservation
├── .claude/
│   ├── rules/            Declarative constraints (architecture, types, security)
│   ├── skills/           Reusable workflows
│   └── hooks/            Automated enforcement scripts
└── scripts/
    └── verify.sh         Definition of done: typecheck + build
```

## Core abstraction rule

**Only `packages/rag/src/factory.ts` (`ragFromEnv()`) names concrete providers** (Gemini, Supabase, Claude). Everything downstream (`reviewDiff`, `ask`, `reflect`, `addObservation`) takes a `Rag` interface and never imports concrete implementations.

- API routes in `apps/web/app/api/` are thin wrappers over `@em/rag`.
- MCP tools in `apps/mcp-server/` follow the same pattern.
- New providers: add interface in `provider.ts`, implement, wire in `factory.ts`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install all workspace deps |
| `pnpm dev` | Start Next.js dev server (http://localhost:3000) |
| `pnpm seed` | Embed + insert starter observations |
| `pnpm typecheck` | Typecheck all packages in parallel |
| `pnpm build` | Build the web app |
| `pnpm verify` | **Definition of done** — typecheck + build (run before marking tasks complete) |

## Harness memory (engram)

This repo's observation store IS the harness Memory pillar. Use the MCP server tools when available:

- `search_observations` — retrieve relevant lessons before implementing
- `review_diff` — review a diff with citations
- `ask` — Q&A grounded in memory
- `reflect` — propose new observations (human approves before persist)
- `add_observation` — persist an approved observation
- `distill_verify_failure` — turn a failed verify run into an incident proposal

## Environment

Requires `.env` with `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Never commit `.env`.

## Where to start reading code

1. `packages/shared/src/types.ts` — the vocabulary
2. `packages/rag/src/reviewDiff.ts` — read → reason → reflect pipeline
3. `packages/rag/src/reflect.ts` — the write-back loop
4. `packages/vectorstore/src/schema.sql` — pre-filter + kNN
