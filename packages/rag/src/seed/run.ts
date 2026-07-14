/**
 * Seed script — embeds and inserts the starter observations.
 *
 * Run from repo root:  pnpm seed
 * Requires ANTHROPIC/GOOGLE/SUPABASE env vars (see .env.example) and that schema.sql
 * has already been run in Supabase.
 */
import { config } from "dotenv";
import { addObservation, ragFromEnv } from "../index";
import { SEED_OBSERVATIONS } from "./observations";

// Load .env from the repo root regardless of where pnpm invoked us.
config({ path: new URL("../../../../.env", import.meta.url).pathname });

async function main() {
  const rag = ragFromEnv();
  console.log(`Seeding ${SEED_OBSERVATIONS.length} observations…`);

  let ok = 0;
  for (const [i, obs] of SEED_OBSERVATIONS.entries()) {
    try {
      const id = await addObservation(rag, obs);
      ok++;
      console.log(`  [${i + 1}/${SEED_OBSERVATIONS.length}] ${obs.title} → ${id}`);
    } catch (err) {
      console.error(`  [${i + 1}] FAILED: ${obs.title}`, err);
    }
    // Gentle pacing for the Gemini free-tier rate limit.
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`Done. ${ok}/${SEED_OBSERVATIONS.length} inserted.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
