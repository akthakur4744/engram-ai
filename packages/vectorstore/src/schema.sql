-- ─────────────────────────────────────────────────────────────────────────────
-- Engineering Memory — Supabase / Postgres schema
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It creates the pgvector extension, the `observations` table, the indexes that
-- make retrieval fast, and a `match_observations()` function that does the
-- metadata-pre-filter + kNN search in a single round-trip.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists vector;

-- Keep this enum in sync with ObservationType in packages/shared/src/types.ts
do $$ begin
  create type obs_type as enum (
    'observation','best_practice','adr','pattern',
    'incident','security','performance','team_standard'
  );
exception when duplicate_object then null;
end $$;

create table if not exists observations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,                       -- references auth.users once auth is added
  type            obs_type not null default 'observation',
  title           text not null,
  content         text not null,              -- the learning itself; THIS is what gets embedded
  tags            text[] default '{}',
  technology      text[] default '{}',        -- ['react','hooks'] — filtered BEFORE kNN
  repository      text,                       -- 'spendwise', 'expense-tracker-pro'
  language        text,                       -- 'ts','js','sql'
  source          text,                       -- 'personal-note','pr-review','reflector'
  source_ref      text,                       -- optional URL or PR number
  confidence      real default 0.5,
  upvotes         int  default 0,
  embedding       vector(768),                -- must match EmbeddingProvider.dimensions
  embedding_model text not null,              -- 'gemini-embedding-001' — migration insurance
  created_at      timestamptz default now(),
  last_used_at    timestamptz
);

-- HNSW index for approximate kNN over the embedding. `vector_cosine_ops` pairs with
-- the `<=>` cosine-distance operator used below.
create index if not exists observations_embedding_hnsw
  on observations using hnsw (embedding vector_cosine_ops);

-- GIN index accelerates the `technology && ARRAY[...]` pre-filter.
create index if not exists observations_tech_gin
  on observations using gin (technology);

create index if not exists observations_type_idx on observations (type);

-- ─────────────────────────────────────────────────────────────────────────────
-- match_observations: pre-filter on metadata, then rank by cosine similarity.
--
-- Returns each row plus `similarity` = 1 - cosine_distance, in [0,1] (higher = closer).
-- All filter args are optional: pass NULL / empty array to skip that filter.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function match_observations(
  query_embedding vector(768),
  match_count     int    default 5,
  filter_types    obs_type[] default null,
  filter_tech     text[]     default null,
  filter_repo     text       default null,
  filter_language text       default null
)
returns table (
  id              uuid,
  type            obs_type,
  title           text,
  content         text,
  tags            text[],
  technology      text[],
  repository      text,
  language        text,
  source          text,
  source_ref      text,
  confidence      real,
  upvotes         int,
  embedding_model text,
  created_at      timestamptz,
  last_used_at    timestamptz,
  similarity      float
)
language sql stable
as $$
  select
    o.id, o.type, o.title, o.content, o.tags, o.technology, o.repository,
    o.language, o.source, o.source_ref, o.confidence, o.upvotes,
    o.embedding_model, o.created_at, o.last_used_at,
    1 - (o.embedding <=> query_embedding) as similarity
  from observations o
  where (filter_types    is null or o.type = any(filter_types))
    and (filter_tech     is null or o.technology && filter_tech)
    and (filter_repo     is null or o.repository = filter_repo)
    and (filter_language is null or o.language = filter_language)
  order by o.embedding <=> query_embedding   -- <=> is cosine distance; ascending = closest first
  limit match_count;
$$;
