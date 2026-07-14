import type { ChatMessage, LLMOpts } from "@em/shared";

/**
 * LLMProvider — text in, text out. The reasoning half of the system.
 *
 * `rag` talks only to this interface, so Claude can be swapped for another model
 * without touching the pipeline. The `model` option on each call lets one provider
 * instance serve BOTH tiers (cheap haiku for prep calls, sonnet for the final answer).
 */
export interface LLMProvider {
  /** One-shot completion. */
  generate(messages: ChatMessage[], opts?: LLMOpts): Promise<string>;

  /** Same, but yields text chunks as they arrive — for streaming UIs. */
  stream(messages: ChatMessage[], opts?: LLMOpts): AsyncIterable<string>;
}

/** Well-known model ids, so callers don't sprinkle string literals everywhere. */
export const Models = {
  /** Cheap + fast: query derivation, categorization, reflection proposals. */
  cheap: "claude-haiku-4-5",
  /** High quality: the user-facing review / answer. */
  quality: "claude-sonnet-4-6",
} as const;
