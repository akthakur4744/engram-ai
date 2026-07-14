import type { ObservationInput } from "@em/shared";

/**
 * Seed observations — the initial shared memory.
 *
 * These are written the way YOU would write them from memory across your repos
 * (spendwise, expense-tracker-pro, FundTrack, aspire-app-lite, saas-dashboard,
 * node-assignment). Edit freely: this is your voice, your lessons. The demo relies
 * on at least the "derived state with useEffect" one existing so a bad diff can cite it.
 *
 * TODO(you): skim each repo's history and replace/extend these with 5-10 real lessons
 * per repo. The richer and more specific this list, the better the demo lands.
 */
export const SEED_OBSERVATIONS: ObservationInput[] = [
  {
    type: "best_practice",
    title: "Don't derive state with useEffect",
    content:
      "If a value can be computed from existing props/state, compute it during render (useMemo if expensive) instead of storing it in state and syncing via useEffect. The effect version causes an extra render, can flash stale values, and drifts out of sync.",
    technology: ["react", "hooks"],
    tags: ["derived-state", "useeffect", "usememo"],
    repository: "spendwise",
    language: "ts",
    source: "personal-note",
    confidence: 0.9,
  },
  {
    type: "pattern",
    title: "Colocate context provider with its hook",
    content:
      "Export a `useX()` hook alongside each context provider that throws if used outside the provider. Consumers never touch the raw context and you get a clear error instead of undefined.",
    technology: ["react", "context"],
    tags: ["context", "provider", "hooks"],
    repository: "expense-tracker-pro",
    language: "ts",
    source: "personal-note",
    confidence: 0.8,
  },
  {
    type: "best_practice",
    title: "Keep the category enum in shared/types",
    content:
      "Domain enums (transaction category, account type) live in a shared types module, not duplicated per feature. One source of truth keeps the UI, API, and DB in agreement and makes exhaustiveness checks work.",
    technology: ["typescript"],
    tags: ["enum", "shared-types", "single-source-of-truth"],
    repository: "expense-tracker-pro",
    language: "ts",
    source: "personal-note",
    confidence: 0.75,
  },
  {
    type: "best_practice",
    title: "Enable TS strict and noUncheckedIndexedAccess",
    content:
      "strict plus noUncheckedIndexedAccess catches the majority of runtime 'undefined is not a function' bugs at compile time, especially around array access and optional fields. Turn it on at project start; retrofitting later is painful.",
    technology: ["typescript"],
    tags: ["tsconfig", "strict", "safety"],
    language: "ts",
    source: "personal-note",
    confidence: 0.85,
  },
  {
    type: "pattern",
    title: "Validate API input at the boundary with zod",
    content:
      "Parse request bodies with a zod schema at the route boundary and pass the typed result inward. The rest of the handler works with validated, typed data and you get consistent 400s for free.",
    technology: ["node", "zod", "typescript"],
    tags: ["validation", "api", "boundary"],
    repository: "node-assignment",
    language: "ts",
    source: "personal-note",
    confidence: 0.8,
  },
  {
    type: "incident",
    title: "Floating point money caused rounding drift",
    content:
      "Summing amounts as JS floats accumulated cent-level errors in reports. Store money as integer minor units (paise/cents) and format only at display time.",
    technology: ["javascript", "node"],
    tags: ["money", "rounding", "float"],
    repository: "FundTrack",
    language: "ts",
    source: "incident",
    confidence: 0.9,
  },
  {
    type: "performance",
    title: "Memoize list rows, not the whole list",
    content:
      "Wrapping each row in React.memo with a stable key + callback props prevents re-rendering the entire transaction list when one row changes. Memoizing the parent list alone doesn't help if props identity changes.",
    technology: ["react", "performance"],
    tags: ["react-memo", "lists", "rerender"],
    repository: "spendwise",
    language: "ts",
    source: "personal-note",
    confidence: 0.7,
  },
  {
    type: "best_practice",
    title: "Stable keys must not be array index",
    content:
      "Use a stable domain id as the React key for lists that reorder or filter. Array index as key causes wrong state to stick to the wrong row after sorting/deletion.",
    technology: ["react"],
    tags: ["keys", "lists"],
    language: "ts",
    source: "personal-note",
    confidence: 0.85,
  },
  {
    type: "pattern",
    title: "Abort in-flight fetches on unmount",
    content:
      "Pass an AbortController signal to fetch inside effects and abort on cleanup. Prevents setState-after-unmount warnings and wasted work when the user navigates quickly.",
    technology: ["react", "fetch"],
    tags: ["abortcontroller", "cleanup", "effects"],
    language: "ts",
    source: "personal-note",
    confidence: 0.75,
  },
  {
    type: "security",
    title: "Never put secrets in NEXT_PUBLIC_ vars",
    content:
      "Anything prefixed NEXT_PUBLIC_ is inlined into the client bundle. Keep API keys and service-role tokens in unprefixed server-only env vars, read them only in route handlers/server components.",
    technology: ["nextjs", "security"],
    tags: ["env", "secrets", "next-public"],
    repository: "saas-dashboard",
    language: "ts",
    source: "personal-note",
    confidence: 0.95,
  },
  {
    type: "security",
    title: "Supabase service-role key is server-only",
    content:
      "The service-role key bypasses row-level security. Use it only in server code (route handlers, scripts). In the browser use the anon key with RLS policies enforcing per-user access.",
    technology: ["supabase", "security"],
    tags: ["rls", "service-role", "auth"],
    language: "ts",
    source: "personal-note",
    confidence: 0.9,
  },
  {
    type: "best_practice",
    title: "Handle async errors in Express with a wrapper",
    content:
      "Wrap async route handlers in a helper that forwards rejections to next(err), or use a framework that awaits handlers. A bare async handler that throws leaves the request hanging.",
    technology: ["node", "express"],
    tags: ["async", "error-handling", "express"],
    repository: "node-assignment",
    language: "ts",
    source: "personal-note",
    confidence: 0.8,
  },
  {
    type: "adr",
    title: "Chose Module Federation for micro-frontends",
    content:
      "Adopted Webpack Module Federation to share a design system across apps. React and react-dom are declared as singletons in shared config to avoid multiple React copies and invalid-hook-call errors.",
    technology: ["react", "webpack", "module-federation"],
    tags: ["microfrontend", "singleton", "architecture"],
    repository: "saas-dashboard",
    language: "ts",
    source: "personal-note",
    confidence: 0.7,
  },
  {
    type: "team_standard",
    title: "Feature folders over type folders",
    content:
      "Group files by feature (transactions/, budgets/) not by type (components/, hooks/). Colocation keeps related code together and makes deletion of a feature a single-folder operation.",
    technology: ["react", "architecture"],
    tags: ["structure", "colocation"],
    language: "ts",
    source: "personal-note",
    confidence: 0.65,
  },
  {
    type: "best_practice",
    title: "Debounce search inputs before querying",
    content:
      "Debounce free-text search (~300ms) before firing the query/network call. Cuts request volume dramatically and avoids janky intermediate results.",
    technology: ["react", "performance"],
    tags: ["debounce", "search"],
    repository: "expense-tracker-pro",
    language: "ts",
    source: "personal-note",
    confidence: 0.7,
  },
  {
    type: "pattern",
    title: "Represent loading as a discriminated union",
    content:
      "Model async UI state as {status:'idle'|'loading'|'success'|'error'} with data only present on success, instead of separate isLoading/error/data booleans that can contradict each other.",
    technology: ["react", "typescript"],
    tags: ["state-machine", "discriminated-union", "async"],
    language: "ts",
    source: "personal-note",
    confidence: 0.8,
  },
  {
    type: "performance",
    title: "Add DB index for the columns you filter on",
    content:
      "Queries filtering by user_id + created_at were doing sequential scans. A composite index on (user_id, created_at desc) turned the dashboard query from ~400ms to ~15ms.",
    technology: ["postgres", "performance"],
    tags: ["index", "query", "database"],
    repository: "FundTrack",
    language: "sql",
    source: "incident",
    confidence: 0.85,
  },
  {
    type: "best_practice",
    title: "Prefer useMemo over useEffect for derived data",
    content:
      "For a value derived synchronously from inputs (filtered/sorted lists, totals), useMemo returns it during render. Reserve useEffect for genuine side effects (subscriptions, network, DOM).",
    technology: ["react", "hooks"],
    tags: ["usememo", "useeffect", "derived-state"],
    repository: "spendwise",
    language: "ts",
    source: "personal-note",
    confidence: 0.85,
  },
  {
    type: "observation",
    title: "Optimistic updates need a rollback path",
    content:
      "Optimistic UI feels fast but must snapshot previous state and restore it if the mutation fails, otherwise a failed request leaves the UI showing data that was never saved.",
    technology: ["react"],
    tags: ["optimistic-update", "mutation", "rollback"],
    language: "ts",
    source: "personal-note",
    confidence: 0.7,
  },
  {
    type: "team_standard",
    title: "Every PR gets a one-line why, not just what",
    content:
      "PR descriptions state the reason for the change, not only the diff summary. Six months later the 'why' is what nobody can reconstruct from the code.",
    technology: ["process"],
    tags: ["pr", "documentation", "review"],
    source: "personal-note",
    confidence: 0.6,
  },
  {
    type: "pattern",
    title: "Env parsing in one typed config module",
    content:
      "Read and validate process.env once in a config module that exports a typed object. The rest of the app imports config.x instead of reaching into process.env with string keys everywhere.",
    technology: ["node", "typescript"],
    tags: ["config", "env", "typed"],
    language: "ts",
    source: "personal-note",
    confidence: 0.75,
  },
  {
    type: "best_practice",
    title: "Tailwind: extend the theme, don't inline magic values",
    content:
      "Put brand colors/spacing in tailwind.config theme.extend and reference tokens, rather than scattering arbitrary values like text-[#3b3b3b]. Keeps the design system consistent and themeable.",
    technology: ["tailwind", "css"],
    tags: ["design-system", "tokens", "tailwind"],
    repository: "saas-dashboard",
    language: "ts",
    source: "personal-note",
    confidence: 0.65,
  },
  {
    type: "incident",
    title: "Missing await on a fire-and-forget write lost data",
    content:
      "An un-awaited async DB write in a serverless handler was killed when the function returned. Always await writes (or explicitly waitUntil) before responding in serverless environments.",
    technology: ["node", "serverless"],
    tags: ["async", "await", "serverless"],
    language: "ts",
    source: "incident",
    confidence: 0.85,
  },
  {
    type: "best_practice",
    title: "Return early to avoid deep nesting",
    content:
      "Guard clauses that return early on invalid input keep the happy path un-indented and readable. Prefer them over wrapping the whole body in nested if blocks.",
    technology: ["typescript", "javascript"],
    tags: ["readability", "guard-clause"],
    language: "ts",
    source: "personal-note",
    confidence: 0.6,
  },
];
