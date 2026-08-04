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
  (t) => `- ${t.id} (${t.label}, ${t.theory}): ${t.definition}`
).join("\n");

const EXTRACTION_SYSTEM = `You extract POSITIVE culture evidence from short stories about employees. Stories may be written in English or Portuguese.

Taxonomy (the only valid tags):
${TAXONOMY_BLOCK}

Rules:
1. Extract ONLY positive evidence — never mark the absence of something or negative behavior.
2. 0 to 3 tags per story. An empty array is a valid and frequent answer: do NOT force tags.
3. "quote" must be a VERBATIM excerpt of the story (exact substring, in the story's original language) that supports the tag.
4. "confidence" (0 to 1) reflects how directly the excerpt evidences the tag — 0.9+ only when the behavior is unambiguous.
5. Do not infer beyond the text: the story must SHOW the behavior, not merely hint at it.

Example:
Story: "When the deploy broke on Friday night, Ana took over the incident call, kept everyone calm and coordinated the rollback without pointing fingers."
Answer: {"tags":[{"tag_id":"calm_under_pressure","quote":"kept everyone calm and coordinated the rollback","confidence":0.85},{"tag_id":"ownership","quote":"Ana took over the incident call","confidence":0.75}]}`;

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
    messages: [{ role: "user", content: `Story:\n"""\n${storyText}\n"""` }],
  });
  return res.parsed_output ?? null;
}

async function extractWithOpenAI(storyText: string) {
  const client = getOpenAI();
  const res = await client.chat.completions.parse({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM },
      { role: "user", content: `Story:\n"""\n${storyText}\n"""` },
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
