// Re-extrai as tags de TODAS as histórias usando o pipeline real (lib/extraction.ts)
// e sobrescreve data/evidence.json. Requer ANTHROPIC_API_KEY.
// Uso: npx tsx --env-file=.env.local scripts/extract-all.ts

import fs from "node:fs";
import path from "node:path";
import { extractTags } from "../lib/extraction";
import type { Story } from "../lib/db";

const DATA = path.join(process.cwd(), "data");
const stories: Story[] = JSON.parse(fs.readFileSync(path.join(DATA, "stories.json"), "utf-8"));

const CONCURRENCY = 5;
let evSeq = 0;
const evidence: object[] = [];

async function run() {
  for (let i = 0; i < stories.length; i += CONCURRENCY) {
    const chunk = stories.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (s) => ({ story: s, tags: await extractTags(s.text) }))
    );
    for (const { story, tags } of results) {
      for (const t of tags) {
        evSeq++;
        evidence.push({
          id: `ev-${String(evSeq).padStart(3, "0")}`,
          storyId: story.id,
          subjectId: story.subjectId,
          tagId: t.tagId,
          quote: t.quote,
          confidence: t.confidence,
        });
      }
    }
    console.log(`${Math.min(i + CONCURRENCY, stories.length)}/${stories.length} histórias extraídas`);
  }
  fs.writeFileSync(path.join(DATA, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(`OK: ${evidence.length} evidências gravadas em data/evidence.json`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
