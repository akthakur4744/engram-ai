# Engram AI

> A RAG-plus-culture system: engineers (or agents) contribute distilled observations, and every future code review, Q&A, or PR analysis retrieves and cites them. Corrections propagate — the system learns.

Engram AI is built around the "Agent Culture" idea — AI systems that share a persistent, editable knowledge substrate they both **read from** and **write to**. That write-back loop (the _reflector_) is the differentiator over generic "chat with your docs" RAG.

*An [engram](https://en.wikipedia.org/wiki/Engram_(neuropsychology)) is a neuroscience term for a memory trace stored in the brain — exactly what the `observations` table is.*

---

## Screenshots

What it actually looks like to use — a Next.js UI at `/review` with two ways in (a GitHub PR link or a pasted diff), both landing on the same cited review + culture-loop panel.

<table>
<tr>
<td width="50%">
<img src="docs/screenshots/home.png" alt="Home page"/>
<br/><sub><b>Home.</b> One paragraph explaining the culture loop, one link into the Reviewer — no dashboard to learn first.</sub>
</td>
<td width="50%">
<img src="docs/screenshots/review-pr-link.png" alt="Paste a GitHub PR link"/>
<br/><sub><b>PR-link mode (default).</b> Paste a public GitHub PR URL (or the <code>owner/repo#123</code> shorthand) — no token, no OAuth, nothing to configure. Public repos only, by design, for now.</sub>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/screenshots/review-paste-diff.png" alt="Paste a raw diff"/>
<br/><sub><b>Diff-paste mode.</b> No real PR handy? Paste any unified diff directly. Same backend pipeline either way — the UI just swaps how the diff string gets sourced.</sub>
</td>
<td width="50%">
<img src="docs/screenshots/review-pr-result.png" alt="Review of a real PR" />
<br/><sub><b>A live PR, reviewed.</b> This is <code>octocat/Hello-World#1</code>, fetched straight from the GitHub API and reviewed in real time — not a canned example.</sub>
</td>
</tr>
</table>

<img src="docs/screenshots/review-diff-result.png" alt="Full review with citations, why-retrieved panel, and reflector proposals" width="100%"/>

**The full loop, in one screenshot:**
- **Left — the review.** Written by Claude, and every claim that's backed by prior team knowledge is cited inline as `[#n]`, not just asserted.
- **Top right — "Why retrieved."** The exact observations pulled from the shared memory for this diff, each with its similarity score. Retrieval is never a black box here.
- **Bottom right — "Reflector."** New observations the system distilled from *this* diff, proposed for you to save. Click **Save** and the next similar diff will retrieve them too — that write-back is what turns this from "chat with your code" into a memory that compounds.

---

## The one demo that explains everything

1. Paste a git diff into **/review**.
2. The system derives a search query, retrieves relevant observations from a shared memory, and writes a review that **cites** them as `[#n]`.
3. After the review, a _reflector_ proposes new observations distilled from the diff. You **approve** the good ones.
4. The next similar diff now retrieves what you just saved. **That loop is the whole project.**

The seeded memory already contains _"Don't derive state with useEffect"_, so the sample diff (which reintroduces that anti-pattern) gets flagged with a citation on the very first run.

---

## How RAG works here (the mental model)

```mermaid
flowchart LR
    U(["You"]) -->|"diff or question"| WEB["Web UI (/review)"]
    U -->|"diff or question"| MCP["MCP tools<br/>(Cursor / Claude Desktop)"]

    WEB --> CORE["RAG Core<br/>packages/rag"]
    MCP --> CORE

    CORE -->|"1. embed query"| EMB["Embeddings<br/>(Gemini)"]
    EMB -->|"2. vector search"| STORE[("Vector Store<br/>Supabase + pgvector")]
    STORE -->|"3. relevant observations"| CORE

    CORE -->|"4. generate, citing sources"| LLM["LLM<br/>(Claude, two-tier)"]
    LLM -->|"cited review / answer"| WEB

    LLM -->|"5. propose new observations"| GATE{"You approve?"}
    GATE -->|"yes"| STORE
    GATE -->|"no"| DROP(["discarded"])
```

Two independent paths meet at one store: observation text is embedded and written to pgvector on the WRITE side; a diff or question is turned into a query, embedded, and matched against that same store by cosine similarity on the READ side. Key idea: **embeddings are for search, the LLM is for reasoning, and they never touch each other** — the LLM only ever sees retrieved _text_, never a vector. Anthropic ships no embedding model on purpose — pairing Claude (generation) with Gemini (embeddings) is the standard production pattern, and it's exactly what the `EmbeddingProvider` / `LLMProvider` interfaces encode.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#system-overview) for the full diagram and the provider interfaces that encode this.

---

## Architecture — one core, many interfaces

```
engram-ai/
├── apps/
│   ├── web/            Next.js 15 — UI (/review) + API routes (thin wrappers over the core)
│   └── mcp-server/     MCP server exposing the same core as tools
├── packages/
│   ├── shared/         domain types every package agrees on (Observation, Retrieved…)
│   ├── embeddings/     EmbeddingProvider interface + GeminiEmbeddingProvider
│   ├── vectorstore/    VectorStore interface + SupabaseVectorStore + schema.sql
│   ├── llm/            LLMProvider interface + ClaudeLLMProvider (haiku + sonnet tiers)
│   └── rag/            THE CORE: reviewDiff · ask · reflect · addObservation + the seeder
```

Every capability lives in `packages/rag` and is called identically from the Next.js routes and the MCP server. The provider interfaces mean any single backend swaps without the pipeline noticing; `ragFromEnv()` is the _only_ place the concrete Gemini/Supabase/Claude choices are named.

**Two-tier Claude** keeps costs down: `claude-haiku-4-5` for the cheap prep calls (deriving a query, reflecting), `claude-sonnet-4-6` for the user-facing review.

Full component diagram, sequence diagrams, and the DB schema are in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Setup

**Prerequisites:** Node ≥ 20, pnpm, and a Supabase project (free tier).

```bash
pnpm install
cp .env.example .env      # then fill in the three keys below
```

Fill `.env` (see `.env.example` for links):

| Var | Where | Free? |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | console.anthropic.com | you have credits |
| `GOOGLE_API_KEY` | aistudio.google.com/apikey | yes — 1,500 req/day, no card |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | yes |

**Create the schema:** open Supabase → SQL Editor → paste and run
[`packages/vectorstore/src/schema.sql`](packages/vectorstore/src/schema.sql). This creates the
`observations` table, the pgvector HNSW index, and the `match_observations()` search function.

**Seed the memory:**

```bash
pnpm seed        # embeds + inserts ~24 starter observations
```

**Run:**

```bash
pnpm dev         # http://localhost:3000  → open /review
```

---

## Retrieval mechanics worth knowing

- **Metadata pre-filter before kNN.** `match_observations()` applies `type` / `technology` / `repository` filters in the `WHERE` clause _before_ ranking by vector distance. Smaller candidate set = faster and more accurate. (The single highest-value practice in this whole thing.)
- **Cosine distance** via pgvector's `<=>` operator; `similarity = 1 - distance`, surfaced in the "Why retrieved" panel so retrieval is never a black box.
- **`embedding_model` on every row** is migration insurance: swap embedders later and you know exactly which rows need re-embedding.

---

## Roadmap

- **M1 (this)** — Reviewer + culture loop end to end. ✅ scaffolded here.
- **M2** — `/ask` free-form Q&A with streaming + metadata-filter chips. (`packages/rag/ask.ts` is ready.)
- **M3** — multi-role: split `code_reviewer` / `standards_agent` / `docs_agent`, each with its own retrieval scope over the same memory.
- **M4** — MCP server in `apps/mcp-server/` exposing `search_observations` / `review_diff` / `ask` as tools — the same core, reachable from Claude Desktop / Cursor.
- **Stretch** — swap `GeminiEmbeddingProvider` → a Cloudflare Qwen3 provider and A/B retrieval quality (the `embedding_model` column makes this clean).

---

## Where to start reading the code

For the full architecture (diagrams, data flow, schema), see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — and **[docs/LEARNINGS.md](docs/LEARNINGS.md)** for the engineering decisions and gotchas behind them. To start reading code directly:

1. [`packages/shared/src/types.ts`](packages/shared/src/types.ts) — the vocabulary.
2. [`packages/rag/src/reviewDiff.ts`](packages/rag/src/reviewDiff.ts) — the full read→reason→reflect pipeline in ~60 lines.
3. [`packages/rag/src/reflect.ts`](packages/rag/src/reflect.ts) — the write-back loop that makes this "culture," not just search.
4. [`packages/vectorstore/src/schema.sql`](packages/vectorstore/src/schema.sql) — where the pre-filter + kNN actually happen.
