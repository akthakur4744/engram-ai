import { config } from "dotenv";

// One .env at the repo root feeds both the seed script and Next.js. Next only loads
// .env from its own dir by default, so we hydrate process.env from the root here.
config({ path: new URL("../../.env", import.meta.url).pathname });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The @em/* workspace packages ship raw TypeScript; Next must transpile them.
  transpilePackages: [
    "@em/rag",
    "@em/shared",
    "@em/embeddings",
    "@em/vectorstore",
    "@em/llm",
  ],
};

export default nextConfig;
