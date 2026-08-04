import OpenAI from "openai";

// Seleção de provedor por variável de ambiente:
//   OPENAI_API_KEY    → OpenAI (modelo em OPENAI_MODEL, default gpt-4o)
//   ANTHROPIC_API_KEY → Anthropic (claude-sonnet-5)
// Se ambas existirem, a Anthropic tem prioridade (tool use + cache já otimizados aqui).

export type Provider = "anthropic" | "openai";

export function getProvider(): Provider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error("Nenhuma chave configurada — defina OPENAI_API_KEY (ou ANTHROPIC_API_KEY) em .env.local");
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

let openaiClient: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI();
  return openaiClient;
}
