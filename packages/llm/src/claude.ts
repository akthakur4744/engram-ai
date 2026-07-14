import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, LLMOpts } from "@em/shared";
import { type LLMProvider, Models } from "./provider";

/**
 * Claude implementation of LLMProvider (via @anthropic-ai/sdk).
 *
 * `defaultModel` is the quality tier; individual calls can override it with
 * `opts.model` (e.g. `Models.cheap`) to use the cheaper/faster tier. That's how the
 * pipeline keeps costs down: haiku for the throwaway prep calls, opus for the answer.
 *
 * Anthropic's API takes the system prompt as a TOP-LEVEL field, not a message, so we
 * split any `system` messages out of the array before sending.
 */
export class ClaudeLLMProvider implements LLMProvider {
  #client: Anthropic;
  #defaultModel: string;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY, defaultModel: string = Models.quality) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    this.#client = new Anthropic({ apiKey });
    this.#defaultModel = defaultModel;
  }

  async generate(messages: ChatMessage[], opts: LLMOpts = {}): Promise<string> {
    const { system, turns } = split(messages);
    const res = await this.#client.messages.create({
      model: opts.model ?? this.#defaultModel,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.3,
      system,
      messages: turns,
    });
    // For our text-only use the first content block is the answer.
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  async *stream(messages: ChatMessage[], opts: LLMOpts = {}): AsyncIterable<string> {
    const { system, turns } = split(messages);
    const s = this.#client.messages.stream({
      model: opts.model ?? this.#defaultModel,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.3,
      system,
      messages: turns,
    });
    for await (const event of s) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }
}

/** Pull `system` messages out into Anthropic's top-level system field. */
function split(messages: ChatMessage[]): {
  system: string | undefined;
  turns: Anthropic.MessageParam[];
} {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const turns = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  return { system: system || undefined, turns };
}
