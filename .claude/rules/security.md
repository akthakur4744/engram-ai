# Security requirements

## Secrets

- Never commit `.env` or API keys
- Never log `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never import `SupabaseVectorStore` into client components

## Best-effort paths

Reflection (`reflect.ts`) and embedding failures must not crash user-facing flows:

- `parseProposals()` returns `[]` on malformed JSON — reflection is best-effort
- API routes catch errors and return 500 with a message, not a stack trace to the client

## Observation trust

- Reflector proposals start at `confidence: 0.4` — low until a human approves
- Only user-approved observations are persisted via `addObservation`
- The MCP `reflect` tool returns proposals only; `add_observation` requires explicit approval

## Console output

Avoid `console.log` in `packages/*` — use structured error handling. Hooks will flag new `console.log` in package code.

## Staged diff guard

Hooks check staged diffs for obvious secret patterns (`sk-`, `api_key=`, `password=`). Do not bypass.
