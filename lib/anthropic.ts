import Anthropic from "@anthropic-ai/sdk";

// Sonnet 5: não enviar temperature/top_p (rejeitados com 400); thinking adaptativo é o default.
export const MODEL = "claude-sonnet-5";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada — adicione em .env.local");
    }
    client = new Anthropic();
  }
  return client;
}
