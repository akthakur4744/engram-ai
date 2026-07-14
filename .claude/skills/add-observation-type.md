# Skill: Add a new observation type

Cross-file checklist when adding or renaming an `ObservationType`.

## Files to update (all in one PR)

### 1. `packages/shared/src/types.ts`

Add the new value to the `ObservationType` union:

```typescript
export type ObservationType =
  | "observation"
  | "best_practice"
  // ... existing ...
  | "your_new_type";
```

### 2. `packages/vectorstore/src/schema.sql`

Add to the `obs_type` enum:

```sql
create type obs_type as enum (
  'observation','best_practice',...,'your_new_type'
);
```

For existing databases, run a migration:

```sql
ALTER TYPE obs_type ADD VALUE 'your_new_type';
```

### 3. `packages/rag/src/reflect.ts`

Add to `VALID_TYPES` set (~line 52):

```typescript
const VALID_TYPES: ReadonlySet<string> = new Set<ObservationType>([
  "observation", "best_practice", ..., "your_new_type",
]);
```

Update `REFLECT_SYSTEM` prompt if the new type needs special guidance.

### 4. Seed data (optional)

If the new type should appear in starter observations, update `packages/rag/src/seed/observations.ts`.

## Verify sync

After changes, grep for the type name across all four files to confirm consistency:

```bash
rg "your_new_type" packages/
```

## Checklist

- [ ] `types.ts` union updated
- [ ] `schema.sql` enum updated (+ migration for existing DBs)
- [ ] `reflect.ts` VALID_TYPES updated
- [ ] Seed data updated (if applicable)
- [ ] `pnpm verify` passes
