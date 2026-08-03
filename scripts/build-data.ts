// Monta data/company.json, data/stories.json e data/evidence.json a partir da ficha
// de personas + arquivos gerados em data/gen/stories-<time>.json.
// Valida: subject/author existem, tag pertence à taxonomia, quote é substring verbatim.
// Uso: npx tsx scripts/build-data.ts

import fs from "node:fs";
import path from "node:path";
import { PERSONAS, TEAMS } from "./personas";
import { TAG_IDS } from "../lib/taxonomy";

interface GenStory {
  subjectId: string;
  authorId: string | null;
  source: "self" | "peer" | "manager";
  text: string;
  tags: { tagId: string; quote: string; confidence: number }[];
}

const DATA = path.join(process.cwd(), "data");
const GEN = path.join(DATA, "gen");

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const personaIds = new Set(PERSONAS.map((p) => p.id));
const tagIds = new Set<string>(TAG_IDS);

const genFiles = fs.existsSync(GEN)
  ? fs.readdirSync(GEN).filter((f) => f.startsWith("stories-") && f.endsWith(".json"))
  : [];
if (genFiles.length === 0) {
  console.error("Nenhum data/gen/stories-*.json encontrado.");
  process.exit(1);
}

const stories: object[] = [];
const evidence: object[] = [];
let storySeq = 0;
let evSeq = 0;
let droppedQuotes = 0;
let droppedStories = 0;

for (const file of genFiles.sort()) {
  const raw: GenStory[] = JSON.parse(fs.readFileSync(path.join(GEN, file), "utf-8"));
  for (const g of raw) {
    if (!personaIds.has(g.subjectId) || !["self", "peer", "manager"].includes(g.source) || !g.text?.trim()) {
      console.warn(`[${file}] história inválida descartada (subject=${g.subjectId})`);
      droppedStories++;
      continue;
    }
    storySeq++;
    const storyId = `st-${String(storySeq).padStart(3, "0")}`;
    // Datas determinísticas espalhadas pelos últimos ~12 meses (sem Date.now para reprodutibilidade)
    const day = (storySeq * 11) % 360;
    const createdAt = new Date(Date.UTC(2025, 7, 10 + day)).toISOString();
    stories.push({
      id: storyId,
      subjectId: g.subjectId,
      authorId: g.source === "self" ? g.subjectId : g.authorId && personaIds.has(g.authorId) ? g.authorId : null,
      source: g.source,
      text: g.text.trim(),
      createdAt,
    });
    for (const t of g.tags ?? []) {
      if (!tagIds.has(t.tagId)) {
        console.warn(`[${file}] tag desconhecida descartada: ${t.tagId}`);
        droppedQuotes++;
        continue;
      }
      if (!normalize(g.text).includes(normalize(t.quote))) {
        console.warn(`[${file}] quote não-verbatim descartada em ${storyId} (${t.tagId})`);
        droppedQuotes++;
        continue;
      }
      evSeq++;
      evidence.push({
        id: `ev-${String(evSeq).padStart(3, "0")}`,
        storyId,
        subjectId: g.subjectId,
        tagId: t.tagId,
        quote: t.quote,
        confidence: Math.min(1, Math.max(0, t.confidence)),
      });
    }
  }
}

fs.writeFileSync(
  path.join(DATA, "company.json"),
  JSON.stringify(
    {
      teams: TEAMS,
      employees: PERSONAS.map(({ id, name, role, teamId, seniority }) => ({ id, name, role, teamId, seniority })),
    },
    null,
    2
  )
);
fs.writeFileSync(path.join(DATA, "stories.json"), JSON.stringify(stories, null, 2));
fs.writeFileSync(path.join(DATA, "evidence.json"), JSON.stringify(evidence, null, 2));
for (const f of ["live-stories.json", "live-evidence.json"]) {
  const p = path.join(DATA, f);
  if (!fs.existsSync(p)) fs.writeFileSync(p, "[]");
}

console.log(
  `OK: ${stories.length} histórias, ${evidence.length} evidências (${droppedStories} histórias e ${droppedQuotes} evidências descartadas)`
);
