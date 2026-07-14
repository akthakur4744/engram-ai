# Type synchronization

## ObservationType must stay in sync across three files

When adding or renaming an observation type, update **all three** in the same change:

1. `packages/shared/src/types.ts` — `ObservationType` union
2. `packages/vectorstore/src/schema.sql` — `obs_type` enum
3. `packages/rag/src/reflect.ts` — `VALID_TYPES` set (line ~52)

Current values:

```
observation | best_practice | adr | pattern | incident | security | performance | team_standard
```

## Field naming

- TypeScript uses camelCase (`sourceRef`, `embeddingModel`, `createdAt`)
- Postgres uses snake_case (`source_ref`, `embedding_model`, `created_at`)
- `SupabaseVectorStore` maps between them in `rowToObservation()`

## MetadataFilter

Used to pre-filter before kNN search. Fields: `type`, `technology`, `repository`, `language`. Applied in SQL `WHERE` clause before vector ranking — never filter after retrieval.
