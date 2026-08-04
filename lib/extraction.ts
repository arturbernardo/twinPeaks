import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getAnthropic, MODEL } from "./anthropic";
import { getOpenAI, getProvider, OPENAI_MODEL } from "./llm";
import { TAGS, TAG_IDS, type TagId } from "./taxonomy";

const ExtractionSchema = z.object({
  tags: z.array(
    z.object({
      tag_id: z.enum(TAG_IDS),
      quote: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

export interface ExtractedTag {
  tagId: TagId;
  quote: string;
  confidence: number;
}

const TAXONOMY_BLOCK = TAGS.map(
  (t) => `- ${t.id} (${t.labelPt}, ${t.theory}): ${t.definition}`
).join("\n");

const EXTRACTION_SYSTEM = `Você extrai evidências POSITIVAS de cultura de histórias curtas sobre colaboradores.

Taxonomia (as únicas tags válidas):
${TAXONOMY_BLOCK}

Regras:
1. Extraia APENAS evidências positivas — nunca marque a ausência de algo nem comportamentos negativos.
2. 0 a 3 tags por história. Um array vazio é uma resposta válida e frequente: NÃO force tags.
3. "quote" deve ser um trecho VERBATIM da história (substring exata) que sustenta a tag.
4. "confidence" (0 a 1) reflete o quão diretamente o trecho evidencia a tag — 0.9+ só quando o comportamento é inequívoco.
5. Não infira além do texto: a história precisa MOSTRAR o comportamento, não apenas sugerir vagamente.

Exemplo:
História: "Quando o deploy quebrou na sexta à noite, a Ana assumiu a chamada, manteve todo mundo calmo e coordenou o rollback sem apontar culpados."
Resposta: {"tags":[{"tag_id":"calm_under_pressure","quote":"manteve todo mundo calmo e coordenou o rollback","confidence":0.85},{"tag_id":"ownership","quote":"a Ana assumiu a chamada","confidence":0.75}]}`;

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Garante que a quote é substring real da história (mata a alucinação principal). */
export function validateQuotes(storyText: string, tags: ExtractedTag[]): ExtractedTag[] {
  const haystack = normalize(storyText);
  return tags.filter((t) => t.quote.length > 0 && haystack.includes(normalize(t.quote)));
}

async function extractWithAnthropic(storyText: string) {
  const client = getAnthropic();
  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 1500,
    output_config: { format: zodOutputFormat(ExtractionSchema), effort: "low" },
    system: [
      { type: "text", text: EXTRACTION_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: `História:\n"""\n${storyText}\n"""` }],
  });
  return res.parsed_output ?? null;
}

async function extractWithOpenAI(storyText: string) {
  const client = getOpenAI();
  const res = await client.chat.completions.parse({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM },
      { role: "user", content: `História:\n"""\n${storyText}\n"""` },
    ],
    response_format: zodResponseFormat(ExtractionSchema, "extraction"),
  });
  return res.choices[0]?.message.parsed ?? null;
}

export async function extractTags(storyText: string): Promise<ExtractedTag[]> {
  const parsed =
    getProvider() === "anthropic"
      ? await extractWithAnthropic(storyText)
      : await extractWithOpenAI(storyText);
  if (!parsed) return [];
  const tags = parsed.tags.map((t) => ({
    tagId: t.tag_id as TagId,
    quote: t.quote,
    confidence: t.confidence,
  }));
  return validateQuotes(storyText, tags);
}
