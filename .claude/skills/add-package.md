# Skill: Add a new provider package

Ordered workflow for adding a new provider (embedding, vector store, or LLM) to the monorepo.

## Prerequisites

Read `.claude/rules/architecture.md` — providers are wired only in `factory.ts`.

## Steps

### 1. Define or reuse types in `packages/shared`

If the provider needs new domain types, add them to `packages/shared/src/types.ts` and export from `packages/shared/src/index.ts`.

### 2. Create the provider interface

In the target package (e.g. `packages/embeddings/src/provider.ts`):

```typescript
export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}
```

### 3. Implement the concrete provider

Add the implementation file (e.g. `packages/embeddings/src/myprovider.ts`). Keep it self-contained — no imports from `rag`.

### 4. Export from package index

Update `packages/<pkg>/src/index.ts` to export the interface and implementation.

### 5. Wire in factory.ts

Update `packages/rag/src/factory.ts` — this is the **only** place concrete class names appear:

```typescript
import { MyEmbeddingProvider } from "@em/embeddings";

export function ragFromEnv(): Rag {
  return {
    embeddings: new MyEmbeddingProvider(),
    // ...
  };
}
```

### 6. Add env vars

Document new env vars in `.env.example`. Never commit real keys.

### 7. Verify

```bash
pnpm verify
```

All packages must typecheck and the web app must build.

## Checklist

- [ ] Interface in `provider.ts`
- [ ] Implementation file
- [ ] Exported from package index
- [ ] Wired in `factory.ts` only
- [ ] `.env.example` updated
- [ ] `pnpm verify` passes
